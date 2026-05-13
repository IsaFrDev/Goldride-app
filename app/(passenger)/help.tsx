import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HelpScreen() {
  const router = useRouter();

  const faqs = [
    {
      q: "Qanday buyurtma beraman?",
      a: "Asosiy sahifadagi 'Qayerga?' tugmasini bosing, manzilingizni tanlang va 'Olib ketish' nuqtasini xaritada tasdiqlang. So'ngra narxni ko'rib 'Buyurtma berish' tugmasini bosing."
    },
    {
      q: "Sheriklik safar nima?",
      a: "Sheriklik safar - bu siz bilan bir yo'nalishda ketayotgan boshqa yo'lovchilar bilan birga yurishdir. Bu safar narxini 30% gacha arzonlashtiradi."
    },
    {
      q: "To'lov qanday amalga oshiriladi?",
      a: "Tizim hozirda faqat naqd pul orqali to'lovni qo'llab-quvvatlaydi. Tez orada terminal va onlayn to'lovlar qo'shiladi."
    },
    {
      q: "Haydovchi bilan qanday bog'lanaman?",
      a: "Haydovchi topilgach, 'Safar' panelida 'Qo'ng'iroq' tugmasi paydo bo'ladi. Shu tugma orqali bevosita bog'lanishingiz mumkin."
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.title}>Yordam</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Sizga yordam kerakmi?</Text>
          <Text style={styles.contactSub}>Qo'llab-quvvatlash markazimiz bilan bog'laning</Text>
          
          <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('tel:+998901234567')}>
            <Ionicons name="call" size={22} color="#FFF" />
            <Text style={styles.contactBtnText}>Markazga qo'ng'iroq</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.telegramBtn} onPress={() => Linking.openURL('https://t.me/taksi_support')}>
            <Ionicons name="paper-plane" size={22} color="#FFF" />
            <Text style={styles.contactBtnText}>Telegram orqali yozish</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Ko'p beriladigan savollar</Text>
        
        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.faqQ}>{faq.q}</Text>
            <Text style={styles.faqA}>{faq.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
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
  contactCard: {
    backgroundColor: '#121212',
    padding: 24,
    borderRadius: 20,
    marginBottom: 30,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  contactSub: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  faqCard: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    paddingBottom: 20,
  },
  faqQ: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94A3B8',
  }
});
