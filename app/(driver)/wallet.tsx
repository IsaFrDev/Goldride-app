import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Modal, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t, getLanguage } from '../../services/i18n';
import { authAPI, ridesAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type Transaction = {
  id: string;
  type: 'earning' | 'withdraw' | 'commission';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuthStore();
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'earning' | 'withdraw' | 'commission' | 'deposit'>('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'deposit' | 'withdraw'>('deposit');
  const [requestAmount, setRequestAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const [walletResp, requestsResp] = await Promise.all([
        authAPI.getWallet(),
        authAPI.getWalletRequests(),
      ]);

      const wallet = walletResp.data;
      const requests = requestsResp.data;

      setBalance(wallet.balance);
      
      let allTxns: Transaction[] = [];

      // Transactions from backend
      if (wallet.transactions && wallet.transactions.length > 0) {
        allTxns = wallet.transactions.map((tx: any) => ({
            id: `tx-${tx.id}`,
            type: tx.transaction_type === 'topup' ? 'earning' : tx.transaction_type,
            amount: Number(tx.amount),
            description: tx.description,
            date: tx.created_at,
            status: tx.status === 'completed' ? 'completed' : 'pending',
        }));
      }

      // Add pending/rejected wallet requests as items too
      if (requests && requests.length > 0) {
        const reqTxns: Transaction[] = requests.map((req: any) => ({
          id: `req-${req.id}`,
          type: req.request_type,
          amount: req.request_type === 'withdraw' ? -Number(req.amount) : Number(req.amount),
          description: req.request_type === 'withdraw' ? "Yechish so'rovi" : "Hamyonni to'ldirish so'rovi",
          date: req.created_at,
          status: req.status === 'approved' ? 'completed' : (req.status === 'rejected' ? 'failed' : 'pending'),
        }));
        allTxns = [...allTxns, ...reqTxns];
      }

      // Sort by date descending
      allTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTxns);

      // Simple stats (could be refined)
      setTotalEarnings(allTxns.filter(t => t.type === 'earning').reduce((acc, t) => acc + t.amount, 0));
      setTotalWithdrawn(Math.abs(allTxns.filter(t => t.type === 'withdraw' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0)));

    } catch (error) {
      console.log('Wallet data error:', error);
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
      case 'earning': return { name: 'arrow-down', color: '#4CAF50', bg: '#0A1F0D' };
      case 'deposit': return { name: 'add-circle', color: '#4CAF50', bg: '#0A1F0D' };
      case 'withdraw': return { name: 'arrow-up', color: '#FF5252', bg: '#1F0A0A' };
      case 'commission': return { name: 'remove-circle', color: '#FF9800', bg: '#1F150A' };
      default: return { name: 'swap-horizontal', color: '#94A3B8', bg: '#1A1A1A' };
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'earning': return t('wallet.earnings');
      case 'deposit': return "To'ldirish";
      case 'withdraw': return t('wallet.withdraw');
      case 'commission': return t('wallet.commission');
      default: return t('wallet.transaction');
    }
  };

  const handleWalletRequest = async () => {
    const amount = parseInt(requestAmount);
    if (!amount || amount < 5000) {
      Alert.alert("Xato", "Minimal miqdor: 5 000 UZS");
      return;
    }

    if (requestType === 'withdraw' && amount > balance) {
      Alert.alert("Xato", "Balans yetarli emas");
      return;
    }

    if (!user?.telegram_username) {
      Alert.alert(
        "Telegram username kiritilmagan", 
        "So'rov yuborishdan oldin profilingizda telegram usernameingizni ko'rsatishingiz kerak.",
        [{ text: "Profilga o'tish", onPress: () => router.push('/(driver)/profile') }, { text: "Bekor qilish" }]
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await authAPI.createWalletRequest({
        request_type: requestType,
        amount: amount
      });

      Alert.alert(
        "So'rov yuborildi", 
        "Adminga xabar yuborildi. Tez orada so'rovingiz ko'rib chiqiladi."
      );
      setShowRequestModal(false);
      setRequestAmount('');
      loadWalletData();
    } catch (e) {
      Alert.alert("Xato", "So'rovni yuborishda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.balanceLabel}>{t('wallet.available_balance')}</Text>
          <Animated.Text style={[styles.balanceAmount, {
            opacity: balanceAnim,
            transform: [{ scale: balanceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          }]}>
            {formatPrice(balance)}
          </Animated.Text>
          <Text style={styles.balanceCurrency}>UZS</Text>

          {pendingBalance > 0 && (
            <View style={styles.pendingRow}>
              <Ionicons name="time-outline" size={14} color="#FFB800" />
              <Text style={styles.pendingText}>
                {t('wallet.pending')}: {formatPrice(pendingBalance)} UZS
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity 
                style={[styles.withdrawMainBtn, { flex: 1, backgroundColor: '#4CAF50', shadowColor: '#4CAF50' }]} 
                onPress={() => { setRequestType('deposit'); setShowRequestModal(true); }}
                activeOpacity={0.8}
            >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={[styles.withdrawMainText, { color: '#FFF' }]}>To'ldirish</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.withdrawMainBtn, { flex: 1 }]} 
                onPress={() => { setRequestType('withdraw'); setShowRequestModal(true); }}
                activeOpacity={0.8}
            >
                <Ionicons name="card-outline" size={20} color="#000" />
                <Text style={styles.withdrawMainText}>{t('wallet.withdraw')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: '#0A1F0D' }]}>
              <Ionicons name="trending-up" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{formatPrice(totalEarnings)}</Text>
            <Text style={styles.statLabel}>{t('wallet.total_earned')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: '#1F0A0A' }]}>
              <Ionicons name="card" size={18} color="#FF5252" />
            </View>
            <Text style={styles.statValue}>{formatPrice(totalWithdrawn)}</Text>
            <Text style={styles.statLabel}>{t('wallet.total_withdrawn')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconWrap, { backgroundColor: '#1F150A' }]}>
              <Ionicons name="trending-down" size={18} color="#FF9800" />
            </View>
            <Text style={styles.statValue}>{formatPrice(totalCommission)}</Text>
            <Text style={styles.statLabel}>{t('wallet.commission')}</Text>
          </View>
        </View>

        {/* Transactions Header */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>{t('wallet.transactions')}</Text>
          <Text style={styles.transactionsCount}>{t('wallet.filter_count', { count: transactions.length })}</Text>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'earning', 'deposit', 'withdraw', 'commission'] as const).map(filter => (
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
                  <View style={styles.txMeta}>
                    <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                    {tx.status === 'pending' && (
                      <View style={styles.txPendingBadge}>
                        <Text style={styles.txPendingText}>{t('wallet.pending')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: tx.amount >= 0 ? '#4CAF50' : '#FF5252' }]}>
                  {tx.amount >= 0 ? '+' : '-'}{formatPrice(tx.amount)} 
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Request Modal (Deposit/Withdraw) */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {requestType === 'deposit' ? "Hamyonni to'ldirish" : "Mablag' yechish"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t('wallet.available_balance')}: {formatPrice(balance)} UZS
            </Text>

            <Text style={styles.inputLabel}>Miqdor (UZS)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="50 000"
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={requestAmount}
              onChangeText={setRequestAmount}
            />

            {/* Quick amount buttons */}
            <View style={styles.quickAmounts}>
              {[50000, 100000, 200000, 500000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickAmountBtn, requestAmount === amt.toString() && styles.quickAmountBtnActive]}
                  onPress={() => setRequestAmount(amt.toString())}
                >
                  <Text style={[styles.quickAmountText, requestAmount === amt.toString() && styles.quickAmountTextActive]}>
                    {formatPrice(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.cardHint}>
              * So'rov yuborilgandan so'ng admin siz bilan bog'lanadi.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => { setShowRequestModal(false); setRequestAmount(''); }}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, requestType === 'deposit' && { backgroundColor: '#4CAF50' }]} 
                onPress={handleWalletRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name={requestType === 'deposit' ? "add-circle-outline" : "card-outline"} size={18} color="#FFF" />
                    <Text style={[styles.modalConfirmText, { color: '#FFF' }]}>Yuborish</Text>
                  </>
                )}
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

  // Header
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
  balanceLabel: {
    fontSize: 13, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 16, fontWeight: '700', color: '#FFB800', marginTop: 2, marginBottom: 16,
  },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A160A', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 16,
  },
  pendingText: { fontSize: 12, fontWeight: '600', color: '#FFB800' },

  // Withdraw main button (inside balance card)
  withdrawMainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFB800', paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 18, gap: 10, marginTop: 4,
    shadowColor: '#FFB800', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  withdrawMainIcon: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  withdrawMainText: {
    flex: 1, fontSize: 16, fontWeight: '800', color: '#000', textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 24,
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
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 12, color: '#666', fontWeight: '500' },
  txPendingBadge: {
    backgroundColor: '#2D260D', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  txPendingText: { fontSize: 10, fontWeight: '700', color: '#FFB800' },
  txAmount: { fontSize: 16, fontWeight: '800' },

  // Empty state
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
  cardHint: { fontSize: 12, color: '#666', marginTop: -10, marginBottom: 16, paddingLeft: 4 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  quickAmountBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333',
  },
  quickAmountBtnActive: { backgroundColor: '#2D260D', borderColor: '#FFB800' },
  quickAmountText: { fontSize: 12, fontWeight: '700', color: '#FFB800' },
  quickAmountTextActive: { color: '#FFB800' },
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
});
