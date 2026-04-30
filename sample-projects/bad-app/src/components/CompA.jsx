// Component that imports a screen (layer violation) AND imports a service
// (layer violation), forming a circular dep via ScreenA.
import React from 'react';
import { Text } from 'react-native';
import ScreenA from '../screens/ScreenA';
import { loadData } from '../services/dataService';

export default function CompA() {
  loadData();
  return <Text>CompA {ScreenA ? '' : ''}</Text>;
}
