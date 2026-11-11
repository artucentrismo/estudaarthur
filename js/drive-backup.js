/**
 * Cópia de segurança pessoal no Google Drive.
 * Usa OAuth no navegador (sem client secret e sem enviar dados ao servidor).
 * O token fica somente em memória e nunca é gravado no localStorage.
 */
import { readLocalBundle } from './cloud-sync.js';

const CLIENT_ID = document.querySelector('meta[name="google-drive-client-id"]')?.content?.trim() || '';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'Estudaarthur - Backup automático.json';
const FILE_ID_KEY = 'ciclo-estudaarthur-drive-file-v1';
let tokenClient = null;
let accessToken = null;
let uploadTimer = null;
let busy = false;
let connected = false;

const status = (message, error = false) => {
  const node = document.getElementById('drive-backup-status');
  if (node) {
    node.textContent = message;
    node.style.color = error ? 'var(--rd)' : 'var(--mu)';
  }
};

function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = '1';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Não foi possível carregar a conexão segura do Google.'));
    document.head.appendChild(script);
  });
}

function backupPayload() {
  const bundle = readLocalBundle();
  return {
    format: 'ciclo-local-backup-v1',
    exportedAt: new Date().toISOString(),
    state: bundle.cycle || window.S || null,
    anki: JSON.stringify(bundle.anki || { decks: [], notes: [], cards: [], logs: [] })
  };
}

async function driveRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error?.message || 'O Google Drive recusou a operação (' + response.status + ').');
  }
  return response.status === 204 ? null : response.json();
}

async function uploadBackup() {
  if (!accessToken || busy || !connected) return;
  busy = true;
  status('Salvando cópia no Google Drive…');
  try {
    const payload = backupPayload();
    const metadata = { name: FILE_NAME, mimeType: 'application/json' };
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    body.append('file', new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    let fileId = localStorage.getItem(FILE_ID_KEY);
    let result;
    if (fileId) {
      try {
        result = await driveRequest(
          'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(fileId) + '?uploadType=multipart&fields=id,name,modifiedTime',
          { method: 'PATCH', body }
        );
      } catch (error) {
        if (!/404|not found/i.test(error.message)) throw error;
        localStorage.removeItem(FILE_ID_KEY);
        fileId = null;
      }
    }
    if (!fileId) {
      result = await driveRequest(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',
        { method: 'POST', body }
      );
      localStorage.setItem(FILE_ID_KEY, result.id);
    }
    status('Cópia atualizada no Google Drive · ' + new Date().toLocaleTimeString('pt-BR'));
  } catch (error) {
    status(error.message + ' Clique em Conectar Drive para tentar novamente.', true);
    if (/401|invalid credentials|expired/i.test(error.message)) {
      accessToken = null;
      connected = false;
    }
  } finally {
    busy = false;
  }
}

async function connectDrive() {
  if (!CLIENT_ID) {
    status('A conexão ainda precisa do ID OAuth do Google. Vou te orientar a configurar isso sem custo; não cole senha nem chave secreta aqui.', true);
    return;
  }
  try {
    await loadGoogleIdentity();
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: response => {
        if (response.error || !response.access_token) {
          status('Não foi possível autorizar o Google Drive. Tente novamente.', true);
          return;
        }
        accessToken = response.access_token;
        connected = true;
        status('Google Drive conectado. Enviando a primeira cópia…');
        uploadBackup();
      }
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } catch (error) {
    status(error.message || 'Falha ao iniciar a conexão com o Google.', true);
  }
}

function scheduleBackup() {
  if (!connected || !accessToken) return;
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(uploadBackup, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('drive-backup-connect');
  if (button) button.addEventListener('click', connectDrive);
});
window.addEventListener('ciclo:account-ready', () => {
  if (!connected) status('Conta do Estudaarthur conectada. Conecte o Google Drive para ativar a cópia extra.');
});
window.addEventListener('ciclo:local-change', scheduleBackup);
