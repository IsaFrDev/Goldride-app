import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t, getLanguage } from '../../services/i18n';
import { useRouter } from 'expo-router';
import { authAPI, ridesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Transaction = {
  id: string;
  type: 'topup' | 'payment' | 'refund';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending';
};

export default function PassengerWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, language } = useAuthStore();
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [goldPoints, setGoldPoints] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalTopup, setTotalTopup] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'topup' | 'payment' | 'refund'>('all');
  const [selectedPayMethod, setSelectedPayMethod] = useState<'humo' | 'uzcard'>('humo');

  useEffect(() => {
    if (isAuthenticated) {
      loadWalletData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.spring(balanceAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadWalletData = async () => {
    try {
      const [profileResp, walletResp, historyResp] = await Promise.all([
        authAPI.getProfile(),
        authAPI.getWallet(),
        ridesAPI.getHistory(),
      ]);

      const profile = profileResp.data;
      const wallet = walletResp.data;
      const rides = historyResp.data.results || historyResp.data || [];
      
      setBalance(wallet.balance);
      setGoldPoints(profile.gold_points || 0);
      
      // Transactions from backend
      if (wallet.transactions && wallet.transactions.length > 0) {
        const txns: Transaction[] = wallet.transactions.map((tx: any) => ({
            id: tx.id.toString(),
            type: tx.transaction_type, // 'topup', 'payment', etc
            amount: Number(tx.amount),
            description: tx.description,
            date: tx.created_at,
            status: tx.status === 'completed' ? 'completed' : 'pending',
        }));
        
        // Sort by date descending
        txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txns);
        
        const spent = txns
            .filter(tx => tx.amount < 0)
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        setTotalSpent(spent);
        setTotalTopup(Number(wallet.balance) + spent);
      } else {
        // Fallback for demo if no transactions
        const fallbackTxns: Transaction[] = [
             { id: '1', type: 'topup', amount: 50000, description: `Simulated: ${t('wallet.card_topup')}`, date: new Date().toISOString(), status: 'completed' },
        ];
        setTransactions(fallbackTxns);
        setTotalSpent(0);
        setTotalTopup(50000);
      }
    } catch (error) {
      console.log('Wallet error:', error);
      setBalance(150000);
      setTotalSpent(85000);
      setTotalTopup(235000);
      setTransactions([
        {
          id: 'd-1', type: 'topup', amount: 200000,
          description: t('wallet.card_topup'),
          date: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'completed',
        },
        {
          id: 'd-2', type: 'payment', amount: -35000,
          description: 'Safar: Oybek → Chorsu',
          date: new Date(Date.now() - 86400000).toISOString(), status: 'completed',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return Math.abs(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return t('time.now');
    if (hours < 24) return t('time.hours_ago', { n: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return t('time.yesterday');
    if (days < 7) return t('time.days_ago', { n: days });
    return d.toLocaleDateString(getLanguage() === 'uz' ? 'uz-UZ' : getLanguage() === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short' });
  };

  const getTransactionIcon = (type: string): { name: any; color: string; bg: string } => {
    switch (type) {
      case 'topup': return { name: 'add-circle', color: '#4CAF50', bg: '#0A1F0D' };
      case 'payment': return { name: 'car', color: '#FF5252', bg: '#1F0A0A' };
      case 'refund': return { name: 'refresh-circle', color: '#2196F3', bg: '#0A121F' };
      default: return { name: 'swap-horizontal', color: '#94A3B8', bg: '#1A1A1A' };
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'topup': return t('wallet.topup');
      case 'payment': return t('wallet.payment');
      case 'refund': return t('wallet.refund');
      default: return t('wallet.transaction');
    }
  };

  const handleTopup = () => {
    const amount = parseInt(topupAmount);
    if (!amount || amount < 5000) {
      Alert.alert(t('common.error'), t('wallet.topup_min'));
      return;
    }
    if (!cardNumber || cardNumber.length < 16) {
      Alert.alert(t('common.error'), t('wallet.invalid_card'));
      return;
    }

    Alert.alert(
      t('common.confirm'),
      t('wallet.confirm_topup', { amount: formatPrice(amount), card: cardNumber.slice(-4) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              await authAPI.depositWallet(amount);
              // Refresh data
              loadWalletData();
              setShowTopupModal(false);
              setTopupAmount('');
              setCardNumber('');
              Alert.alert(t('common.success'), t('wallet.topup_success', { amount: formatPrice(amount) }));
            } catch (error) {
              Alert.alert(t('common.error'), 'Xatolik yuz berdi');
            }
          },
        },
      ]
    );
  };

  const filteredTransactions = activeFilter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === activeFilter);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
         <Ionicons name="wallet-outline" size={80} color="#333" style={{ marginBottom: 20 }} />
         <Text style={[styles.headerTitle, { textAlign: 'center', marginBottom: 10 }]}>Hamyon va To'lovlar</Text>
         <Text style={{ color: '#94A3B8', textAlign: 'center', lineHeight: 22 }}>
           Balansingizni ko'rish va hisobni to'ldirish uchun avval tizimga kiring.
         </Text>
         <TouchableOpacity 
           style={[styles.topupMainBtn, { marginTop: 30, width: '100%' }]}
           onPress={() => router.push('/(auth)/phone')}
         >
           <Text style={styles.topupMainText}>Kirish / Ro'yxatdan o'tish</Text>
         </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
          <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        </View>

        {/* Balance Card */}
        <Animated.View style={[styles.balanceCard, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }]}>
          <View style={styles.balanceGlow} />
          <View style={styles.balanceGlow2} />
          <Text style={styles.balanceLabel}>{t('wallet.available_balance')}</Text>
          <Animated.Text style={[styles.balanceAmount, {
            opacity: balanceAnim,
            transform: [{ scale: balanceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          }]}>
            {formatPrice(balance)}
          </Animated.Text>
          <Text style={styles.balanceCurrency}>UZS</Text>

          {/* Top Up Button */}
          <TouchableOpacity 
            style={styles.topupMainBtn} 
            onPress={() => setShowTopupModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.topupMainIcon}>
              <Ionicons name="add" size={24} color="#000" />
            </View>
            <Text style={styles.topupMainText}>{t('wallet.topup')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#000" />
          </TouchableOpacity>
        </Animated.View>

        {/* GoldPoints Reveal */}
        <View style={styles.pointsCard}>
            <View style={styles.pointsContent}>
                <View>
                    <Text style={styles.pointsLabel}>GoldPoints</Text>
                    <Text style={styles.pointsValue}>{goldPoints}</Text>
                </View>
                <View style={styles.pointsBadge}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                </View>
            </View>
            <Text style={styles.pointsHint}>{t('wallet.points_hint', { defaultValue: 'Har bir safari uchun ochkolar to\'plang!' })}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: '#0A1F0D' }]}>
              <Ionicons name="add-circle" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{formatPrice(totalTopup)}</Text>
            <Text style={styles.statLabel}>{t('wallet.total_topup')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: '#1F0A0A' }]}>
              <Ionicons name="car" size={18} color="#FF5252" />
            </View>
            <Text style={styles.statValue}>{formatPrice(totalSpent)}</Text>
            <Text style={styles.statLabel}>{t('wallet.for_rides')}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.payInfoCard}>
          <Ionicons name="information-circle" size={20} color="#FFB800" />
          <Text style={styles.payInfoText}>
            {t('wallet.auto_pay_info')}
          </Text>
        </View>

        {/* Transactions Header */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>{t('wallet.transactions')}</Text>
          <Text style={styles.transactionsCount}>{t('wallet.filter_count', { count: transactions.length })}</Text>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'topup', 'payment', 'refund'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                {filter === 'all' ? t('wallet.all_transactions') : getTransactionLabel(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>{t('wallet.history_empty')}</Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const icon = getTransactionIcon(tx.type);
            return (
              <View key={tx.id} style={styles.txCard}>
                <View style={[styles.txIcon, { backgroundColor: icon.bg }]}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txDescription} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.amount >= 0 ? '#4CAF50' : '#FF5252' }]}>
                  {tx.amount >= 0 ? '+' : '-'}{formatPrice(tx.amount)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Top-up Modal */}
      <Modal visible={showTopupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('wallet.topup')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('wallet.available_balance')}: {formatPrice(balance)} UZS
            </Text>
            
            <View style={styles.conversionHint}>
              <Ionicons name="sparkles" size={16} color="#FFB800" />
              <Text style={styles.conversionHintText}>
                Har 1 000 UZS uchun 1 Ball (GoldPoint) sovg'a qilinadi!
              </Text>
            </View>

            <Text style={styles.inputLabel}>{t('wallet.amount_uzs')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="50 000"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={topupAmount}
              onChangeText={setTopupAmount}
            />

            {/* Quick amount buttons */}
            <View style={styles.quickAmounts}>
              {[10000, 50000, 100000, 200000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickAmountBtn, topupAmount === amt.toString() && styles.quickAmountBtnActive]}
                  onPress={() => setTopupAmount(amt.toString())}
                >
                  <Text style={[styles.quickAmountText, topupAmount === amt.toString() && styles.quickAmountTextActive]}>
                    {formatPrice(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Card Type Selection */}
            <Text style={styles.inputLabel}>{t('wallet.card_type')}</Text>
            <View style={styles.cardTypeRow}>
              <TouchableOpacity
                style={[styles.cardTypeBtn, selectedPayMethod === 'humo' && styles.cardTypeBtnActive]}
                onPress={() => setSelectedPayMethod('humo')}
              >
                <Text style={[styles.cardTypeLogo, selectedPayMethod === 'humo' && styles.cardTypeLogoActive]}>HUMO</Text>
                {selectedPayMethod === 'humo' && <Ionicons name="checkmark-circle" size={18} color="#FFB800" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardTypeBtn, selectedPayMethod === 'uzcard' && styles.cardTypeBtnActive]}
                onPress={() => setSelectedPayMethod('uzcard')}
              >
                <Text style={[styles.cardTypeLogo, selectedPayMethod === 'uzcard' && styles.cardTypeLogoActive]}>UzCard</Text>
                {selectedPayMethod === 'uzcard' && <Ionicons name="checkmark-circle" size={18} color="#FFB800" />}
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('wallet.card_number')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={selectedPayMethod === 'humo' ? '9860 1234 5678 9012' : '8600 1234 5678 9012'}
              placeholderTextColor="#555"
              keyboardType="numeric"
              maxLength={16}
              value={cardNumber}
              onChangeText={setCardNumber}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => { setShowTopupModal(false); setTopupAmount(''); setCardNumber(''); }}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleTopup}>
                <Ionicons name="add-circle" size={18} color="#000" />
                <Text style={styles.modalConfirmText}>{t('wallet.topup')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },

  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },

  // Balance Card
  balanceCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 16,
    backgroundColor: '#0A0A0A', borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: '#1E1E1E', overflow: 'hidden',
  },
  balanceGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#FFB800', opacity: 0.06,
  },
  balanceGlow2: {
    position: 'absolute', bottom: -40, left: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#4CAF50', opacity: 0.04,
  },
  balanceLabel: {
    fontSize: 13, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 16, fontWeight: '700', color: '#FFB800', marginTop: 2, marginBottom: 20,
  },

  // Top up main button
  topupMainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFB800', paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 18, gap: 10,
    shadowColor: '#FFB800', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  topupMainIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  topupMainText: {
    flex: 1, fontSize: 16, fontWeight: '800', color: '#000', textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#0A0A0A', borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  statDivider: { width: 1, backgroundColor: '#1E1E1E', marginVertical: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center' },

  // GoldPoints Card
  pointsCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#1E1B00', borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: '#5C430D',
  },
  pointsContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsLabel: { fontSize: 12, fontWeight: '700', color: '#FFB800', textTransform: 'uppercase', letterSpacing: 1 },
  pointsValue: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  pointsBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2D260D', justifyContent: 'center', alignItems: 'center' },
  pointsHint: { fontSize: 12, color: '#FFB800', marginTop: 10, opacity: 0.8, fontWeight: '600' },

  // Payment info
  payInfoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 24, padding: 14,
    backgroundColor: '#1A160A', borderRadius: 14,
    borderWidth: 1, borderColor: '#2D260D',
  },
  payInfoText: { flex: 1, fontSize: 13, color: '#FFB800', fontWeight: '600', lineHeight: 18 },

  // Transactions
  transactionsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  transactionsTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  transactionsCount: { fontSize: 13, fontWeight: '600', color: '#666' },

  // Filter chips
  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#121212', borderWidth: 1, borderColor: '#1E1E1E',
  },
  filterChipActive: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
  filterChipText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  filterChipTextActive: { color: '#000' },

  // Transaction card
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 8, padding: 16,
    backgroundColor: '#0A0A0A', borderRadius: 18,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  txIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  txDetails: { flex: 1 },
  txDescription: { fontSize: 14, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  txDate: { fontSize: 12, color: '#666', fontWeight: '500' },
  txAmount: { fontSize: 16, fontWeight: '800' },

  // Empty
  emptyContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12,
  },
  emptyText: { fontSize: 15, color: '#444', fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, borderWidth: 1, borderColor: '#1E1E1E', borderBottomWidth: 0,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#333',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 24, fontWeight: '500' },
  inputLabel: {
    fontSize: 12, fontWeight: '700', color: '#666',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16,
    fontSize: 18, fontWeight: '700', color: '#FFF',
    borderWidth: 1, borderColor: '#333', marginBottom: 16,
  },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickAmountBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333',
  },
  quickAmountBtnActive: { backgroundColor: '#2D260D', borderColor: '#FFB800' },
  quickAmountText: { fontSize: 12, fontWeight: '700', color: '#FFB800' },
  quickAmountTextActive: { color: '#FFB800' },
  cardTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  cardTypeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333',
  },
  cardTypeBtnActive: { borderColor: '#FFB800', backgroundColor: '#1A160A' },
  cardTypeLogo: { fontSize: 16, fontWeight: '900', color: '#666' },
  cardTypeLogoActive: { color: '#FFB800' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333',
  },
  modalCancelText: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  modalConfirmBtn: {
    flex: 2, flexDirection: 'row', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFB800',
  },
  modalConfirmText: { fontSize: 16, fontWeight: '800', color: '#000' },
  conversionHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A160A', padding: 12, borderRadius: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#2D260D',
  },
  conversionHintText: { fontSize: 13, color: '#FFB800', fontWeight: '700' },
});
