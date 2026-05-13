import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { authAPI, getApiUrl, setApiUrl } from '../../services/api';
import { t } from '../../services/i18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();
  
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrlState] = useState(getApiUrl());
  const [urlSaving, setUrlSaving] = useState(false);

  const handleSaveUrl = async () => {
    if (!apiUrl.startsWith('http')) {
      Alert.alert('Xato', 'URL http:// yoki https:// bilan boshlanishi kerak');
      return;
    }
    setUrlSaving(true);
    try {
      await setApiUrl(apiUrl);
      Alert.alert('Tayyor', `Server manzili o'zgartirildi:\n${apiUrl}`);
    } catch (e) {
      Alert.alert('Xato', 'Saqlab bo\'lmadi');
    } finally {
      setUrlSaving(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert(t('common.error'), t('settings.first_name_required'));
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.updateProfile({
        first_name: firstName,
        last_name: lastName,
      });
      setUser(response.data);
      Alert.alert(t('common.success'), t('settings.update_success'));
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.update_error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('settings.title')}</Text>
        </View>
        <View style={styles.center}>
            <Text style={{color: '#94A3B8', marginBottom: 20}}>{t('settings.login_required')}</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/phone')}>
                <Text style={{color: '#000', fontWeight: '800'}}>{t('welcome.start')}</Text>
            </TouchableOpacity>

            <View style={[styles.serverSection, { width: '90%', marginTop: 50 }]}>
                <Text style={styles.serverTitle}>⚙️ Server sozlamalari</Text>
                <Text style={styles.serverHint}>Backend API manzilini kiritib saqlang</Text>
                <View style={styles.serverInputRow}>
                    <TextInput
                    style={styles.serverInput}
                    value={apiUrl}
                    onChangeText={setApiUrlState}
                    placeholder="192.168.x.x:8000"
                    placeholderTextColor="#555"
                    autoCapitalize="none"
                    autoCorrect={false}
                    />
                    <TouchableOpacity 
                    style={[styles.serverSaveBtn, urlSaving && { opacity: 0.5 }]} 
                    onPress={handleSaveUrl}
                    disabled={urlSaving}
                    >
                    {urlSaving ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="checkmark" size={20} color="#000" />}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('reg.first_name')}</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('settings.enter_first_name')}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('reg.last_name')}</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('settings.enter_last_name')}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('auth.phone_title')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#F5F5F5', color: '#888' }]}
            value={user?.phone}
            editable={false}
          />
          <Text style={styles.hint}>{t('settings.phone_readonly')}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
        </TouchableOpacity>

        {/* Server URL Config */}
        <View style={styles.serverSection}>
          <Text style={styles.serverTitle}>⚙️ Server sozlamalari</Text>
          <Text style={styles.serverHint}>Backend API manzilini kiriting (masalan: http://192.168.1.5:8000/api)</Text>
          <View style={styles.serverInputRow}>
            <TextInput
              style={styles.serverInput}
              value={apiUrl}
              onChangeText={setApiUrlState}
              placeholder="http://192.168.x.x:8000/api"
              placeholderTextColor="#555"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity 
              style={[styles.serverSaveBtn, urlSaving && { opacity: 0.5 }]} 
              onPress={handleSaveUrl}
              disabled={urlSaving}
            >
              {urlSaving ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="checkmark" size={20} color="#000" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#000000'
  },
  loginBtn: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 14
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 30,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  hint: {
    fontSize: 12,
    color: '#444',
    marginTop: 8,
    marginLeft: 4
  },
  saveBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#FFB800',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
  },
  serverSection: {
    marginTop: 40,
    backgroundColor: '#0A0A0A',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  serverTitle: {
    color: '#FFB800',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  serverHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  serverInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  serverInput: {
    flex: 1,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  serverSaveBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
