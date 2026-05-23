import React from 'react';
import { View, Text } from 'react-native';

// ❌ Naming violation: a component file (and its default export) must
// be PascalCase (e.g. MessyCard), not lowercase. Trips Rule 7.
export default function messycard({ label }) {
  return (
    <View>
      <Text>{label}</Text>
    </View>
  );
}
