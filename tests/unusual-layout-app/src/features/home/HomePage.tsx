// Home screen — again under features/, not screens/.
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { fetchTodos } from '../../data-access/TodoClient';

export default function HomePage() {
  const [todos, setTodos] = useState<any[]>([]);
  useEffect(() => {
    fetchTodos().then(setTodos);
  }, []);
  return (
    <View>
      <Text>Your todos</Text>
      <FlatList data={todos} renderItem={({ item }) => <Text>{item.title}</Text>} keyExtractor={(i) => String(i.id)} />
    </View>
  );
}
