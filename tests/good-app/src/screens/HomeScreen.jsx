import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useUsers } from '../hooks/useUsers';
import UserCard from '../components/UserCard';

export default function HomeScreen() {
  const { data, loading } = useUsers();

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UserCard user={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
