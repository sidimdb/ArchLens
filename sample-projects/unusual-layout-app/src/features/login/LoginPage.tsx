// Non-standard: screen file lives in a feature folder, not /screens/.
// Filename suffix 'Page' + nav registration should classify as screen.
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { useAuth } from '../../shared/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const { login, error } = useAuth();
  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={pass} onChangeText={setPass} secureTextEntry />
      <Button title="Log in" onPress={() => login(email, pass)} />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
