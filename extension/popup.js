document.addEventListener('DOMContentLoaded', () => {
  const identityList = document.getElementById('identityList');
  const emptyState = document.getElementById('emptyState');
  const addForm = document.getElementById('addForm');
  const showAddFormBtn = document.getElementById('showAddFormBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const nameInput = document.getElementById('nameInput');
  const urlInput = document.getElementById('urlInput');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  // Load identities
  loadIdentities();

  // Event Listeners
  showAddFormBtn.addEventListener('click', () => {
    addForm.style.display = 'block';
    showAddFormBtn.style.display = 'none';
    nameInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    addForm.style.display = 'none';
    showAddFormBtn.style.display = 'block';
    clearForm();
  });

  saveBtn.addEventListener('click', saveIdentity);

  exportBtn.addEventListener('click', exportConfig);
  
  importBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', importConfig);

  function loadIdentities() {
    chrome.storage.local.get(['identities'], (result) => {
      const identities = result.identities || [];
      renderList(identities);
    });
  }

  function renderList(identities) {
    identityList.innerHTML = '';
    
    if (identities.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';

    identities.forEach((identity, index) => {
      const item = document.createElement('div');
      item.className = 'identity-item';
      item.innerHTML = `
        <div style="flex: 1; overflow: hidden;">
          <div class="identity-name">${escapeHtml(identity.name)}</div>
          <div class="identity-url">${escapeHtml(identity.url)}</div>
        </div>
        <button class="icon-btn delete-btn" data-index="${index}" title="Delete">✕</button>
      `;

      // Click to fill
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-btn')) {
          fillForm(identity.url);
        }
      });

      // Delete button
      const deleteBtn = item.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteIdentity(index);
      });

      identityList.appendChild(item);
    });
  }

  function saveIdentity() {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
      alert('Please fill in both fields');
      return;
    }

    chrome.storage.local.get(['identities'], (result) => {
      const identities = result.identities || [];
      identities.push({ name, url });
      
      chrome.storage.local.set({ identities }, () => {
        loadIdentities();
        addForm.style.display = 'none';
        showAddFormBtn.style.display = 'block';
        clearForm();
      });
    });
  }

  function deleteIdentity(index) {
    if (confirm('Are you sure you want to delete this identity?')) {
      chrome.storage.local.get(['identities'], (result) => {
        const identities = result.identities || [];
        identities.splice(index, 1);
        chrome.storage.local.set({ identities }, loadIdentities);
      });
    }
  }

  function fillForm(url) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (urlToFill) => {
          // Look for the input field we created in the React app
          // We can identify it by placeholder or structure, but let's try to find the text input inside the form
          const inputs = document.querySelectorAll('input[type="text"]');
          let targetInput = null;
          
          // Find the specific input. In our React code it has placeholder "Paste URL or choose a file"
          // Or we can look for the one near the upload icon.
          for (const input of inputs) {
            if (input.placeholder && (input.placeholder.includes('Paste URL') || input.placeholder.includes('Choose a file'))) {
              targetInput = input;
              break;
            }
          }

          if (targetInput) {
            // React 16+ hack to trigger onChange
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(targetInput, urlToFill);
            
            const event = new Event('input', { bubbles: true });
            targetInput.dispatchEvent(event);
            
            // Also trigger change just in case
            const changeEvent = new Event('change', { bubbles: true });
            targetInput.dispatchEvent(changeEvent);
          } else {
            alert('Could not find the import field. Please make sure the "Import your account" modal is open.');
          }
        },
        args: [url]
      });
    });
  }

  function exportConfig() {
    chrome.storage.local.get(['identities'], (result) => {
      const identities = result.identities || [];
      const blob = new Blob([JSON.stringify(identities, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'speakeasy-identities.json';
      a.click();
      
      URL.revokeObjectURL(url);
    });
  }

  function importConfig(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          chrome.storage.local.set({ identities: imported }, () => {
            loadIdentities();
            alert('Identities imported successfully!');
          });
        } else {
          alert('Invalid file format');
        }
      } catch (err) {
        alert('Error parsing JSON file');
      }
      // Reset file input
      importFile.value = '';
    };
    reader.readAsText(file);
  }

  function clearForm() {
    nameInput.value = '';
    urlInput.value = '';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});