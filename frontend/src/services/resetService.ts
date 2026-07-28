import { apiFetch } from './apiHelper';

const API_URL = '/api';

export const resetAll = async (password: string) => {
  const response = await apiFetch(`${API_URL}/reset`, {
    method: 'POST',
    body: JSON.stringify({ confirmPassword: password }),
  });
  if (!response.ok) {
    let message = 'Erreur de réinitialisation';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (_) {}
    throw new Error(message);
  }
  return response.json();
};
