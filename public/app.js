// Importa as funções necessárias do Firebase SDK (versão 9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-check.js";

// --- 1. CONFIGURAÇÃO DO FIREBASE (JÁ SUBSTITUÍDA) ---
const firebaseConfig = {
  apiKey: "AIzaSyBEUsedW2plNtVRQ4iz3AyC40CDfFMQY0I",
  authDomain: "cardistry-dex.firebaseapp.com",
  databaseURL: "https://cardistry-dex-default-rtdb.firebaseio.com",
  projectId: "cardistry-dex",
  storageBucket: "cardistry-dex.firebasestorage.app",
  messagingSenderId: "148059713085",
  appId: "1:148059713085:web:32ee97b963e98dfb3b4454",
  measurementId: "G-RQHXM9SSR4"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. CONFIGURAÇÃO DO APP CHECK (JÁ SUBSTITUÍDA) ---
const RECAPTCHA_SITE_KEY = '6LfZMvErAAAAAG1J21iqjlnLM3ZhDs10QmFEKcGa';
try {
    const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
    });
} catch (err) { console.error("Erro ao ativar o App Check:", err); }

// --- 3. LÓGICA DO FEED E PESQUISA ---
const feedContainer = document.getElementById('feed-container');
const searchBar = document.getElementById('search-bar');

let allMovesData = []; // Cache local

async function loadAllMoves() {
    try {
        const movesRef = collection(db, 'moves_published');
        const q = query(movesRef, orderBy('moveName_normalized', 'asc'));
        const snapshot = await getDocs(q);
        
        allMovesData = [];
        feedContainer.innerHTML = 'Carregando movimentos...';
        
        snapshot.forEach(doc => {
            allMovesData.push({ id: doc.id, ...doc.data() });
        });
        renderMoves(allMovesData);
    } catch (err) {
        console.error("Erro ao carregar movimentos:", err);
        feedContainer.innerHTML = '<p style="color: red;">Erro ao carregar movimentos. Tente recarregar a página.</p>';
    }
}

function renderMoves(movesArray) {
    if (movesArray.length === 0) {
        feedContainer.innerHTML = '<p>Nenhum movimento encontrado.</p>';
        return;
    }
    
    feedContainer.innerHTML = '';
    
    movesArray.forEach(move => {
        const cardHTML = `
            <article class="move-card" data-id="${move.id}">
                ${generateVideoEmbed(move.demoLink)}
                <div class="card-content">
                    <h3 class="card-title">${move.moveName}</h3>
                    <p class="card-meta">Criador: ${move.creatorName} | Ano: ${move.year || 'N/A'}</p>
                    <div class="card-tags">
                        ${(move.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    ${generateDifficulty(move.rating_total_score, move.rating_total_votes)}
                    <p class="card-description">${(move.description || '').substring(0, 150)}...</p>
                </div>
                <div class="card-footer">
                    <button class="report-btn" onclick="reportError('${move.id}', '${move.moveName}')">
                        Sugerir Correção
                    </button>
                </div>
            </article>
        `;
        feedContainer.innerHTML += cardHTML;
    });
}

function filterMoves() {
    const searchTerm = searchBar.value.trim().toLowerCase();
    if (searchTerm === '') {
        renderMoves(allMovesData);
        return;
    }
    const filteredMoves = allMovesData.filter(move => {
        const nameMatch = move.moveName_normalized.includes(searchTerm);
        const creatorMatch = move.creatorName.toLowerCase().includes(searchTerm);
        const tagsMatch = move.tags && move.tags.some(tag => tag.includes(searchTerm));
        return nameMatch || creatorMatch || tagsMatch;
    });
    renderMoves(filteredMoves);
}

function generateVideoEmbed(url) {
    if (!url) return '<div class="video-responsive"><p>Sem Demo</p></div>';
    let embedHtml = '';
    try {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const urlObj = new URL(url);
            const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
            embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else if (url.includes('instagram.com')) {
            embedHtml = `<iframe src="${url.replace(/\/$/, "")}/embed" frameborder="0" scrolling="no" allowtransparency="true" allowfullscreen></iframe>`;
        } else {
             embedHtml = '<p>Link de vídeo inválido</p>';
        }
    } catch (e) {
        embedHtml = '<p>Erro ao carregar vídeo</p>';
    }
    return `<div class="video-responsive">${embedHtml}</div>`;
}

function generateDifficulty(score, votes) {
    if (!votes || votes === 0) {
        return '<p class="card-difficulty">Dificuldade: (Sem votos)</p>';
    }
    const average = (score / votes).toFixed(1);
    return `<p class="card-difficulty">Dificuldade Média: ${average}/5.0 (${votes} votos)</p>`;
}

// Expõe a função reportError globalmente para que o HTML possa chamá-la
window.reportError = async (moveId, moveName) => {
    const correctionText = prompt(`Qual é a sua sugestão de correção para o movimento "${moveName}"?`);
    if (correctionText && correctionText.trim() !== '') {
        try {
            await addDoc(collection(db, 'corrections_pending'), {
                moveId: moveId,
                moveName: moveName,
                suggestion: correctionText,
                submittedAt: new Date()
            });
            alert('Obrigado! Sua sugestão foi enviada para revisão.');
        } catch (err) {
            console.error("Erro ao enviar correção:", err);
            alert('Ops! Algo deu errado ao enviar sua sugestão.');
        }
    }
}

// --- INICIALIZAÇÃO ---
searchBar.addEventListener('input', filterMoves);
loadAllMoves();
