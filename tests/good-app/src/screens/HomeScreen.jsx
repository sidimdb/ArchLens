import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useUsers } from '../hooks/useUsers';
import UserCard from '../components/UserCard';

export default function HomeScreen() {
  const { data, loading } = useUsers();
  const theme = useSelector((s) => s.theme);

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={{ backgroundColor: theme.bg }}>
      <FlatList
        data={data}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UserCard user={item} />}
      />
    </View>
  );
}
