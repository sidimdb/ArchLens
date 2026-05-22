// Non-standard: service file lives in /data-access/, not /services/.
// Filename suffix 'Client' + HTTP calls + no JSX → should be classified as service.
import axios from 'axios';

export async function fetchTodos() {
  const res = await axios.get('https://example.com/todos');
  return res.data;
}

export async function addTodo(title: string) {
  const res = await axios.post('https://example.com/todos', { title });
  return res.data;
}
