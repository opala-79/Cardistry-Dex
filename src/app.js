/**
 * Main app logic (ES module)
 *
 * Features:
 * - Firebase v9 modular usage (Auth, Firestore, Storage)
 * - Realtime feed (onSnapshot)
 * - Add Movement with image upload to Storage and metadata to Firestore
 * - Search by name, creator, year (client-side)
 * - Simple Google Sign-In and Sign-Out
 *
 * IMPORTANT:
 * - Fill src/firebase-config.js with your project's config.
 * - Enable Google Authentication, Firestore and Storage in the Firebase Console.
 */

import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  orderBy,
  query,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

const UI = {
  searchInput: document.getElementById('searchInput'),
  feed: document.getElementById('feed'),
  emptyState: document.getElementById('emptyState'),
  btnAdd: document.getElementById('btnAddMovement'),
  modal: document.getElementById('modalAdd'),
  closeModal: document.getElementById('closeModal'),
  btnCancel: document.getElementById('btnCancel'),
  movementForm: document.getElementById('movementForm'),
  imageInput: document.getElementById('imageInput'),
  uploadProgress: document.getElementById('uploadProgress'),
  btnSignIn: document.getElementById('btnSignIn'),
  btnSignOut: document.getElementById('btnSignOut'),
  userAvatar: document.getElementById('userAvatar'),
  filterYear: document.getElementById('filterYear'),
  filterDifficulty: document.getElementById('filterDifficulty'),
  btnClearFilters: document.getElementById('btnClearFilters')
};

let movements = []; // local cache of movements from Firestore

// Auth handlers
UI.btnSignIn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert('Sign-in failed: ' + err.message);
  }
});

UI.btnSignOut.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    UI.btnSignIn.classList.add('hidden');
    UI.btnSignOut.classList.remove('hidden');
    UI.userAvatar.src = user.photoURL || '';
    UI.userAvatar.classList.remove('hidden');
  } else {
    UI.btnSignIn.classList.remove('hidden');
    UI.btnSignOut.classList.add('hidden');
    UI.userAvatar.classList.add('hidden');
  }
});

// Modal open/close
UI.btnAdd.addEventListener('click', () => {
  openModal();
});
UI.closeModal.addEventListener('click', closeModal);
UI.btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

function openModal() {
  UI.modal.classList.remove('hidden');
  UI.modal.setAttribute('aria-hidden', 'false');
}
function closeModal() {
  UI.modal.classList.add('hidden');
  UI.modal.setAttribute('aria-hidden', 'true');
  UI.movementForm.reset();
  UI.uploadProgress.classList.add('hidden');
  UI.uploadProgress.value = 0;
}

// ====================================================================
// FUNÇÃO CORRIGIDA ABAIXO
// ====================================================================

// Helper to create a card element
function createCard(doc) {
  const data = doc;
  const card = document.createElement('article');
  // Classes do Tailwind para o card
  card.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-[1.02]';

  // Imagem
  let mediaElement;
  if (data.imageUrl) {
    mediaElement = document.createElement('img');
    mediaElement.src = data.imageUrl;
    mediaElement.alt = data.name;
    // Classes do Tailwind para a imagem
    mediaElement.className = 'w-full h-48 object-cover';
  } else {
    mediaElement = document.createElement('div');
    // Classes do Tailwind para o placeholder de imagem
    mediaElement.className = 'w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500';
    mediaElement.textContent = 'No image';
  }

  // Div de conteúdo
  const content = document.createElement('div');
  // Classes do Tailwind para o padding
  content.className = 'p-4';

  // Título
  const title = document.createElement('h3');
  title.textContent = data.name || 'Untitled';
  // Classes do Tailwind para o título
  title.className = 'text-xl font-bold text-gray-900 mb-1';

  // Criador e Ano
  const meta = document.createElement('p');
  meta.textContent = `by ${data.creator || 'Unknown'} ${data.year ? `(${data.year})` : ''}`;
  // Classes do Tailwind para o meta
  meta.className = 'text-sm text-gray-600 mb-3';

  // Descrição
  const desc = document.createElement('p');
  desc.textContent = data.description || '';
  // Classes do Tailwind para a descrição
  desc.className = 'text-sm text-gray-700 mb-4 h-10 line-clamp-2'; // h-10 e line-clamp-2 garantem altura uniforme

  // Container de Tags
  const tagContainer = document.createElement('div');
  tagContainer.className = 'flex flex-wrap gap-2 mb-4';
  
  // Badge de Dificuldade
  if (data.difficulty) {
    const diffBadge = document.createElement('span');
    diffBadge.className = 'bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full';
    diffBadge.textContent = data.difficulty;
    tagContainer.appendChild(diffBadge);
  }
  // Outras Tags
  if (data.tags && data.tags.length > 0) {
    data.tags.forEach(tag => {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full';
      tagBadge.textContent = tag;
      tagContainer.appendChild(tagBadge);
    });
  }

  // Ações (Botão de Vídeo)
  const actions = document.createElement('div');
  // Classes do Tailwind para o container de ações
  actions.className = 'flex gap-2 border-t border-gray-100 pt-3';
  if (data.video) {
    const a = document.createElement('a');
    a.href = data.video;
    a.target = '_blank';
    // Classes do Tailwind para o botão (antigo "btn ghost")
    a.className = 'bg-transparent text-blue-600 font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors text-sm';
    a.textContent = 'Watch Video';
    actions.appendChild(a);
  }

  // Monta o card
  content.append(title, meta, desc, tagContainer, actions);
  card.append(mediaElement, content);
  return card;
}

// ====================================================================
// FIM DA FUNÇÃO CORRIGIDA
// ====================================================================


// Render feed with client-side filtering
function renderFeed() {
  const q = UI.searchInput.value.trim().toLowerCase();
  const yearFilter = UI.filterYear.value.trim();
  const diffFilter = UI.filterDifficulty.value;

  // Remove o estado de vazio antes de filtrar
  if (UI.emptyState.parentNode === UI.feed) {
    UI.feed.removeChild(UI.emptyState);
  }

  const filtered = movements.filter(m => {
    if (yearFilter && String(m.year) !== String(yearFilter)) return false;
    if (diffFilter && m.difficulty !== diffFilter) return false;
    if (!q) return true;
    const hay = `${m.name || ''} ${m.creator || ''} ${m.year || ''} ${m.tags?.join(' ') || ''}`.toLowerCase();
    return hay.includes(q);
  });

  UI.feed.innerHTML = '';
  if (filtered.length === 0) {
    UI.feed.appendChild(UI.emptyState); // O emptyState já está estilizado no HTML
    return;
  }

  filtered.forEach(m => {
    UI.feed.appendChild(createCard(m));
  });
}

// Listen to search and filters
UI.searchInput.addEventListener('input', () => renderFeed());
UI.filterYear.addEventListener('input', () => renderFeed());
UI.filterDifficulty.addEventListener('change', () => renderFeed());
UI.btnClearFilters.addEventListener('click', () => {
  UI.searchInput.value = '';
  UI.filterYear.value = '';
  UI.filterDifficulty.value = '';
  renderFeed();
});

// Firestore: realtime listener for movements collection
const movementsCol = collection(db, 'movements');
const q = query(movementsCol, orderBy('createdAt', 'desc'));

onSnapshot(q, (snapshot) => {
  movements = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  renderFeed();
}, (err) => {
  console.error('Snapshot error', err);
});

// Add movement form handling
UI.movementForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(UI.movementForm);
  const name = form.get('name')?.trim();
  const creator = form.get('creator')?.trim();
  const year = form.get('year') ? Number(form.get('year')) : null;
  const difficulty = form.get('difficulty') || '';
  const description = form.get('description')?.trim() || '';
  const video = form.get('video')?.trim() || '';
  const tagsRaw = form.get('tags')?.trim() || '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!name) {
    alert('Name is required');
    return;
  }

  const currentUser = auth.currentUser;
  const creatorName = creator || (currentUser?.displayName || 'Unknown');

  // Prepare document data
  const docData = {
    name,
    creator: creatorName,
    year,
    difficulty,
    description,
    video,
    tags,
    createdBy: currentUser ? { uid: currentUser.uid, name: currentUser.displayName, email: currentUser.email } : null,
    createdAt: serverTimestamp()
  };

  // If image is present, upload first
  const file = UI.imageInput.files[0];
  if (file) {
    try {
      UI.uploadProgress.classList.remove('hidden');
      const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const sRef = storageRef(storage, `movements/${fileName}`);
      const uploadTask = uploadBytesResumable(sRef, file);

      uploadTask.on('state_changed', (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        UI.uploadProgress.value = percent;
      }, (err) => {
        UI.uploadProgress.classList.add('hidden');
        alert('Upload failed: ' + err.message);
      }, async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        docData.imageUrl = url;
        await addDoc(movementsCol, docData);
        UI.uploadProgress.classList.add('hidden');
        closeModal();
      });
    } catch (err) {
      UI.uploadProgress.classList.add('hidden');
      alert('Error uploading image: ' + err.message);
    }
  } else {
    // No image -> directly add doc
    try {
      await addDoc(movementsCol, docData);
      closeModal();
    } catch (err) {
      alert('Error saving movement: ' + err.message);
    }
  }
});
