document.addEventListener('submit', (event) => {
  const form = event.target;
  const message = form instanceof HTMLFormElement ? form.dataset.confirm : '';

  if (message && !window.confirm(message)) {
    event.preventDefault();
  }
});
