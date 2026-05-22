import { useEffect, useState } from 'react';
import { fetchUsers } from '../services/userService';

export function useUsers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then((u) => {
      setData(u);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
