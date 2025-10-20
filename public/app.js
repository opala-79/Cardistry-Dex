// app.js

// Referências aos serviços
const auth = firebase.auth();
const db = firebase.firestore();

// Referências aos botões
const btnCadastrar = document.getElementById('btn-cadastrar');
const btnLogin = document.getElementById('btn-login');
const btnSalvarMovimento = document.getElementById('btn-salvar-movimento');

// --- INICIALIZAÇÃO DO APP CHECK (com reCAPTCHA v3) ---
const RECAPTCHA_SITE_KEY = '6LfZMvErAAAAAG1J21iqjlnLM3ZhDs10QmFEKcGa'; // Sua Chave de Site

try {
  const appCheck = firebase.appCheck();
  
  // Ativa o App Check usando o reCAPTCHA v3
  appCheck.activate(
    new firebase.appCheck.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    true // true = auto-refresh do token
  );
  console.log("App Check (v3) ativado.");

} catch (err) {
  console.error("Erro ao ativar o App Check:", err);
}

// --- AUTENTICAÇÃO ---

// 1. Cadastrar Usuário
btnCadastrar.addEventListener('click', () => {
    const email = document.getElementById('email-cadastro').value;
    const senha = document.getElementById('senha-cadastro').value;

    auth.createUserWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            console.log("Usuário cadastrado!", userCredential.user);
            // 2. Criar o perfil no banco de dados
            // Usamos o UID (ID único do usuário) como nome do documento
            db.collection("perfis").doc(userCredential.user.uid).set({
                email: email,
                criadoEm: new Date()
            })
            .then(() => console.log("Perfil criado!"))
            .catch(err => console.error("Erro ao criar perfil: ", err));
        })
        .catch(err => console.error("Erro ao cadastrar: ", err));
});

// 3. Login
btnLogin.addEventListener('click', () => {
    const email = document.getElementById('email-login').value;
    const senha = document.getElementById('senha-login').value;

    auth.signInWithEmailAndPassword(email, senha)
        .then(userCredential => console.log("Usuário logado!", userCredential.user))
        .catch(err => console.error("Erro ao logar: ", err));
});

// --- GERENCIAR ESTADO DO LOGIN ---

let usuarioAtual = null; // Variável para guardar o usuário logado

auth.onAuthStateChanged(user => {
    if (user) {
        // Usuário está logado
        usuarioAtual = user;
        document.getElementById('area-logada').style.display = 'block';
        carregarMovimentos(); // Carrega os dados dele
    } else {
        // Usuário está deslogado
        usuarioAtual = null;
        document.getElementById('area-logada').style.display = 'none';
    }
});

// --- BANCO DE DADOS (FIRESTORE) ---

// 4. Adicionar Movimentos
btnSalvarMovimento.addEventListener('click', () => {
    if (!usuarioAtual) return; // Só salva se estiver logado

    const textoMovimento = document.getElementById('novo-movimento').value;

    // Salva o movimento numa sub-coleção "movimentos" dentro do perfil do usuário
    db.collection("perfis").doc(usuarioAtual.uid).collection("movimentos").add({
        descricao: textoMovimento,
        data: new Date()
    })
    .then(() => {
        console.log("Movimento salvo!");
        document.getElementById('novo-movimento').value = ''; // Limpa o campo
        carregarMovimentos(); // Recarrega a lista
    })
    .catch(err => console.error("Erro ao salvar movimento: ", err));
});

// 5. Ler Movimentos
function carregarMovimentos() {
    if (!usuarioAtual) return;

    const lista = document.getElementById('lista-movimentos');
    lista.innerHTML = ''; // Limpa a lista antiga

    // Busca os movimentos ordenados por data
    db.collection("perfis").doc(usuarioAtual.uid).collection("movimentos")
      .orderBy("data", "desc")
      .get()
      .then(querySnapshot => {
          querySnapshot.forEach(doc => {
              const li = document.createElement('li');
              li.textContent = doc.data().descricao;
              lista.appendChild(li);
          });
      })
      .catch(err => console.error("Erro ao ler movimentos: ", err));
}
