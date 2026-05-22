import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, AsyncStorage } from 'react-native';
import axios from 'axios';

// Everything in one file — UI + fetching + storage + multiple components.

function Header({ title }) {
  return <Text style={{ fontSize: 22 }}>{title}</Text>;
}

function Footer() {
  return <Text>© 2026</Text>;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const t = await AsyncStorage.getItem('token');
        setToken(t);
        const res = await axios.get('https://api.example.com/users?page=' + page, {
          headers: { Authorization: 'Bearer ' + t },
        });
        setUsers(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  // Duplicated block 1
  async function refresh() {
    const t = await AsyncStorage.getItem('token');
    const res = await fetch('https://api.example.com/users?page=' + page, {
      headers: { Authorization: 'Bearer ' + t },
    });
    const data = await res.json();
    setUsers(data);
  }

  // Duplicated block 2 (almost identical to refresh)
  async function reload() {
    const t = await AsyncStorage.getItem('token');
    const res = await fetch('https://api.example.com/users?page=' + page, {
      headers: { Authorization: 'Bearer ' + t },
    });
    const data = await res.json();
    setUsers(data);
  }

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>{error}</Text>;

  return (
    <View>
      <Header title="Users" />
      <TextInput value={query} onChangeText={setQuery} />
      <Button title="Refresh" onPress={refresh} />
      <Button title="Reload" onPress={reload} />
      <FlatList
        data={users.filter((u) => u.name.includes(query))}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name}</Text>
            <Text>{item.email}</Text>
          </View>
        )}
      />
      <Footer />
    </View>
  );
}
