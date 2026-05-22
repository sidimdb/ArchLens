const API_URL = 'https://api.example.com/users';

export async function fetchUsers() {
  const res = await fetch(API_URL);
  return res.json();
}
