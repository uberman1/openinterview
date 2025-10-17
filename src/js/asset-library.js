// src/js/asset-library.js
import { store } from './data-store.js';

/** Opens a file picker and creates an asset in the central library. */
export async function pickAndCreateAsset({type='attachment'}={}){
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'resume' ? '.pdf' : '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file){ resolve(null); return; }
      const url = URL.createObjectURL(file);
      const asset = store.createAsset({ name: file.name, url }, { type, name: file.name });
      resolve(asset);
    });
    input.click();
  });
}

export function searchAssets({type, q}){
  return store.listAssets({type, q});
}
