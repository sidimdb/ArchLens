// Service that contains JSX (rule 5 violation) and uses fetch directly.
import React from 'react';
import { View } from 'react-native';

export function loadData() {
  return fetch('https://api.example.com/data').then((r) => r.json());
}

export function ServiceMarkup() {
  return <View />;
}
