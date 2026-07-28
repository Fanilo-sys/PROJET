// src/services/apiHelper.ts

export const getHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Fonction centrale pour tous les appels API.
// En cas d'erreur 401, elle efface la session et recharge la page pour forcer la reconnexion.
export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = getHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    // Remove session and notify app that auth expired.
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    try {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    } catch (e) {
      // ignore if dispatch not supported
    }
    throw new Error('Session expirée, veuillez vous reconnecter.');
  }

  return response;
};