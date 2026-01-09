  // atividades.js
  import { db, auth } from "./firebase-init.js";
  import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp
  } from "./firebase-imports.js";
  


  let mesSelecionado = null;
  let paginaAtual = 1;
  const LIMITE_POR_PAGINA = 15;
  let atividadesCache = [];
  let unsubAtividades = null;

  export function carregarAtividades() {
    const suporteId = auth.currentUser?.uid;
    if (!suporteId) return;

    const q = query(
      collection(db, "atividades_suporte"),
      where("suporteId", "==", suporteId)
    );

    if (unsubAtividades) unsubAtividades();

  unsubAtividades = onSnapshot(q, snap => {
    atividadesCache = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.mesRef && typeof a.mesRef === "string");

    if (!mesSelecionado) {
      const hoje = new Date();
      const y = hoje.getFullYear();
      const m = String(hoje.getMonth() + 1).padStart(2, "0");
      mesSelecionado = `${y}-${m}`;
    }

    paginaAtual = 1;
    renderMesesDisponiveis();
    renderTabela();
  });

  }
  export function paginaProxima() {
    const max = getTotalPaginasMes();
    if (paginaAtual < max) {
      animarTrocaPagina(() => {
        paginaAtual++;
        renderTabela();
      });
    }
  }

  export function paginaAnterior() {
    if (paginaAtual > 1) {
      animarTrocaPagina(() => {
        paginaAtual--;
        renderTabela();
      });
    }
  }

  function renderMesesDisponiveis() {
    const container = document.getElementById("mes-tabs");
    if (!container) return;

    container.innerHTML = "";

    const meses = [...new Set(atividadesCache.map(a => a.mesRef))].sort();

    meses.forEach(mes => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mes-btn" + (mes === mesSelecionado ? " active" : "");
      btn.innerText = formatarMes(mes);

      btn.onclick = () => {
    if (mes === mesSelecionado) return;

    animarTrocaMes(() => {
      mesSelecionado = mes;
      paginaAtual = 1;
      renderMesesDisponiveis();
      renderTabela();
    });
  };


      container.appendChild(btn);
    });
  }

  function renderTabela() {
    const container = document.getElementById("atividades-tabela");
    const pageIndicator = document.getElementById("page-indicator");
    const tituloMes = document.getElementById("mes-titulo");

    if (!container || !pageIndicator) return;

    if (tituloMes && mesSelecionado) {
      tituloMes.innerText = formatarMes(mesSelecionado);
    }

    container.innerHTML = "";

    const filtradas = atividadesCache
      .filter(a => a.mesRef === mesSelecionado && a.pagina === paginaAtual)
      .sort((a, b) => a.ordem - b.ordem);

    const totalPaginas = getTotalPaginasMes();
    const pagina = filtradas;


    for (let i = 0; i < LIMITE_POR_PAGINA; i++) {
      const a = pagina[i] || {};

      const row = document.createElement("div");
      row.className = "linha-atividade";
      row.dataset.docId = a.id || "";

      row.innerHTML = `
        <input class="cell" type="date" value="${a.data || ""}">
        <input class="cell" value="${a.clienteNome || ""}" placeholder="Nome do cliente">
        <select class="cell">
    <option value="" disabled ${!a.tipo ? "selected" : ""}>
      Selecione a atividade
    </option>
    <option value="TREINAMENTO" ${a.tipo==="TREINAMENTO"?"selected":""}>Treinamento</option>
    <option value="APRESENTACAO" ${a.tipo==="APRESENTACAO"?"selected":""}>Apresentação</option>
    <option value="MIGRACAO" ${a.tipo==="MIGRACAO"?"selected":""}>Migração</option>
    <option value="PARAMETRIZACAO" ${a.tipo==="PARAMETRIZACAO"?"selected":""}>Parametrização</option>
  </select>

        <input class="cell" value="${a.observacao || ""}" placeholder="Observações">
      `;

      // 🔑 MARCA COMO ALTERADO
      row.querySelectorAll("input, select").forEach(el => {
        el.addEventListener("change", () => {
          row.dataset.dirty = "true";
          row.classList.add("alterado");
        });
      });

      container.appendChild(row);
    }

    pageIndicator.innerText = `${paginaAtual} / ${totalPaginas}`;
  }


  function formatarMes(mesRef) {
    if (!mesRef || typeof mesRef !== "string") {
      return "Mês inválido";
    }

    const partes = mesRef.split("-");
    if (partes.length !== 2) {
      return mesRef;
    }

    const [y, m] = partes;

    const meses = [
      "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
      "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
    ];

    const idx = Number(m) - 1;

    if (idx < 0 || idx > 11) return mesRef;

    return `${meses[idx]} ${y}`;
  }



window.novaPagina = async function () {
  const suporteId = auth.currentUser?.uid;

  if (!suporteId) {
    mostrarNotificacao("⚠️ Usuário não autenticado");
    return;
  }

  if (!mesSelecionado) {
    mostrarNotificacao("⚠️ Nenhum mês selecionado");
    return;
  }

  // 🔍 descobre última página do mês atual
  const paginas = atividadesCache
    .filter(a => a.mesRef === mesSelecionado)
    .map(a => a.pagina || 1);

  const ultimaPagina = paginas.length
    ? Math.max(...paginas)
    : 1;

  const novaPagina = ultimaPagina + 1;

  showLoading("Criando nova página...");

  try {
    const promises = [];

    for (let i = 1; i <= LIMITE_POR_PAGINA; i++) {
      promises.push(
        addDoc(collection(db, "atividades_suporte"), {
          suporteId,
          mesRef: mesSelecionado,   // ✅ CORRETO
          pagina: novaPagina,       // ✅ CORRETO
          ordem: i,
          data: "",
          clienteNome: "",
          tipo: "",
          observacao: "",
          createdAt: serverTimestamp()
        })
      );
    }

    await Promise.all(promises);

    animarTrocaPagina(() => {
      paginaAtual = novaPagina;
      renderTabela();
    });

    mostrarNotificacao("📄 Nova página criada com sucesso");

  } catch (err) {
    console.error(err);
    mostrarNotificacao("❌ Erro ao criar nova página");
  } finally {
    hideLoading();
  }
};


  function getTotalPaginasMes() {
    const paginas = atividadesCache
      .filter(a => a.mesRef === mesSelecionado)
      .map(a => a.pagina);

    return paginas.length ? Math.max(...paginas) : 1;
  }

  import { updateDoc, doc } from "./firebase-imports.js";

  window.salvarAlteracoesAtividades = async function () {
    const linhas = document.querySelectorAll(".linha-atividade");
    let salvouAlgo = false;

    for (const row of linhas) {
      const inputs = row.querySelectorAll("input, select");

      // 🛑 proteção absoluta
      if (inputs.length < 4) continue;

      const data = inputs[0].value;
      const clienteNome = inputs[1].value.trim();
      const tipo = inputs[2].value;
      const observacao = inputs[3].value;

      // 🔒 obrigatórios
      if (!data || !clienteNome || !tipo) continue;

      const suporteId = auth.currentUser.uid;
      const docId = row.dataset.docId;

      // 🔄 UPDATE
      if (docId) {
        if (!row.dataset.dirty) continue;

        await updateDoc(doc(db, "atividades_suporte", docId), {
          data,
          clienteNome,
          tipo,
          observacao,
          updatedAt: serverTimestamp()
        });

        delete row.dataset.dirty;
        row.classList.remove("alterado");
        salvouAlgo = true;
      }

      // 🆕 CREATE
      else {
        const ordem =
          Array.from(row.parentNode.children).indexOf(row) + 1;

        const novo = await addDoc(collection(db, "atividades_suporte"), {
          suporteId,
          mesRef: mesSelecionado,
          pagina: paginaAtual,
          ordem,
          data,
          clienteNome,
          tipo,
          observacao,
          createdAt: serverTimestamp()
        });

        row.dataset.docId = novo.id;
        delete row.dataset.dirty;
        row.classList.remove("alterado");
        salvouAlgo = true;
      }
    }

 if (salvouAlgo) {
  mostrarNotificacao("💾 Alterações salvas com sucesso");
  if (typeof window.gerarResumoAtividades === "function") {
    window.gerarResumoAtividades();
  }
} else {
  mostrarNotificacao("⚠️ Preencha Cliente, Data e Atividade");
}

    
  };



  function mostrarNotificacao(msg) {
    let container = document.getElementById("toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  function animarTrocaPagina(callback) {
    const container = document.getElementById("atividades-tabela");
    if (!container) {
      callback();
      return;
    }

    container.classList.add("page-exit");

    setTimeout(() => {
      callback();

      container.classList.remove("page-exit");
      container.classList.add("page-enter");

      setTimeout(() => {
        container.classList.remove("page-enter");
      }, 180);

    }, 160);
  }
  function animarTrocaMes(callback) {
    const wrapper = document.getElementById("atividades-wrapper");
    if (!wrapper) {
      callback();
      return;
    }

    wrapper.classList.add("mes-exit");

    setTimeout(() => {
      callback();

      wrapper.classList.remove("mes-exit");
      wrapper.classList.add("mes-enter");

      setTimeout(() => {
        wrapper.classList.remove("mes-enter");
      }, 220);

    }, 200);
  }

  
  function abrirModalCriarMes() {
    const modal = document.getElementById("modal-criar-mes");
    const anoSelect = document.getElementById("novoAnoSelect");

    // popula anos (ano atual ±5)
    const anoAtual = new Date().getFullYear();
    anoSelect.innerHTML = `<option value="">Selecione o ano</option>`;

    for (let a = anoAtual; a <= anoAtual + 5; a++) {
      anoSelect.innerHTML += `<option value="${a}">${a}</option>`;
    }

    modal.style.display = "block";
    document.body.classList.add("modal-open");
  }

  window.fecharModalCriarMes = function () {
    const modal = document.getElementById("modal-criar-mes");
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  };

  window.confirmarCriarNovoMes = async function () {
  const input = document.getElementById("inputMesNovo");
  const mes = input.value;

  if (!mes) {
    alert("Selecione um mês.");
    return;
  }

  showLoading();

  try {
    const suporteId = auth.currentUser.uid;

    for (let i = 1; i <= LIMITE_POR_PAGINA; i++) {
      await addDoc(collection(db, "atividades_suporte"), {
        suporteId,
        mesRef: mes,
        pagina: 1,
        ordem: i,
        data: "",
        clienteNome: "",
        tipo: "",
        observacao: "",
        createdAt: serverTimestamp()
      });
    }

    mesSelecionado = mes;
    paginaAtual = 1;

    closeModalById("modal-criar-mes");
    await carregarAtividades(); // se existir
  } catch (err) {
    console.error(err);
    alert("Erro ao criar o mês.");
  } finally {
    hideLoading();
  }
};


window.abrirResumoAtividades = function () {
  const wrap = document.getElementById("atividades-wrapper");
  const resumo = document.getElementById("atividades-resumo");

  if (!wrap || !resumo) return;

  // saída das atividades
  wrap.classList.add("fade-exit");

  setTimeout(() => {
    wrap.classList.add("fade-exit-active");

    setTimeout(() => {
      wrap.style.display = "none";
      wrap.classList.remove("fade-exit", "fade-exit-active");

      resumo.style.display = "block";
      resumo.classList.add("fade-enter");

      gerarResumoAtividades();

      requestAnimationFrame(() => {
        resumo.classList.add("fade-enter-active");
      });

      setTimeout(() => {
        resumo.classList.remove("fade-enter", "fade-enter-active");
      }, 220);

    }, 180);
  }, 10);
};


window.fecharResumoAtividades = function () {
  const wrap = document.getElementById("atividades-wrapper");
  const resumo = document.getElementById("atividades-resumo");

  if (!wrap || !resumo) return;

  // 🔹 anima saída do resumo
  resumo.classList.add("fade-exit");

  setTimeout(() => {
    resumo.classList.add("fade-exit-active");

    setTimeout(() => {
      resumo.style.display = "none";
      resumo.classList.remove("fade-exit", "fade-exit-active");

      // 🔹 anima entrada das atividades
      wrap.style.display = "block";
      wrap.classList.add("fade-enter");

      requestAnimationFrame(() => {
        wrap.classList.add("fade-enter-active");
      });

      setTimeout(() => {
        wrap.classList.remove("fade-enter", "fade-enter-active");
      }, 220);

    }, 180);
  }, 10);
};



  function gerarResumoAtividades() {
  const body = document.getElementById("resumo-body");
  const footer = document.getElementById("resumo-footer");

  if (!body || !footer) {
    console.warn("Resumo: elementos não encontrados (resumo-body/resumo-footer).");
    return;
  }

  body.innerHTML = "";
  footer.innerHTML = "";

  const resumo = {};
  const totais = {
    APRESENTACAO: 0,
    TREINAMENTO: 0,
    MIGRACAO: 0,
    PARAMETRIZACAO: 0
  };

  // ✅ conta só se estiver “salvo de verdade”
  atividadesCache.forEach(a => {
    const mes = a.mesRef;
    const tipo = a.tipo;
    const cliente = (a.clienteNome || "").trim();
    const data = a.data || "";

    if (!mes || !tipo || !cliente || !data) return;

    if (!resumo[mes]) {
      resumo[mes] = {
        APRESENTACAO: 0,
        TREINAMENTO: 0,
        MIGRACAO: 0,
        PARAMETRIZACAO: 0
      };
    }

    if (resumo[mes][tipo] === undefined) return;

    resumo[mes][tipo]++;
    totais[tipo]++;
  });

  const mesesOrdenados = Object.keys(resumo).sort();

  if (mesesOrdenados.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;opacity:.7;padding:12px;">
          Nenhuma atividade válida salva ainda.
        </td>
      </tr>
    `;
    return;
  }

  mesesOrdenados.forEach(mes => {
    const r = resumo[mes];

    body.innerHTML += `
      <tr>
        <td>${formatarMes(mes)}</td>
        <td>${r.APRESENTACAO}</td>
        <td>${r.TREINAMENTO}</td>
        <td>${r.MIGRACAO}</td>
        <td>${r.PARAMETRIZACAO}</td>
      </tr>
    `;
  });

  footer.innerHTML = `
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td>${totais.APRESENTACAO}</td>
      <td>${totais.TREINAMENTO}</td>
      <td>${totais.MIGRACAO}</td>
      <td>${totais.PARAMETRIZACAO}</td>
    </tr>
  `;
}

window.abrirModalCriarMes = function () {
  const modal = document.getElementById("modal-criar-mes");
  if (!modal) {
    console.error("Modal criar mês não encontrado");
    return;
  }

  modal.classList.add("show");
  document.body.classList.add("modal-open");

  // limpa o campo
  const input = document.getElementById("inputMesNovo");
  if (input) input.value = "";
};

window.closeModalById = function (id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
};

