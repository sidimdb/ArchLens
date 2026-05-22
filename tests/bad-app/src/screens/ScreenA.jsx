// Intentionally bad: screen imports another screen AND a component.
// Component-A will import this back, creating a circular dep.
import React from 'react';
import { View, Text } from 'react-native';
import CompB from '../components/CompA';

export default function ScreenA() {
  return (
    <View>
      <Text>ScreenA</Text>
      <CompB />
    </View>
  );
}
