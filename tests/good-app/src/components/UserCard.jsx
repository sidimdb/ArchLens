import React from 'react';
import { View, Text } from 'react-native';

export default function UserCard({ user }) {
  return (
    <View>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
    </View>
  );
}
