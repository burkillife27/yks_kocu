import { motion } from 'motion/react';
import { 
  Zap, 
  ShieldCheck, 
  Database, 
  Eye, 
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AboutAI() {
  const dataPoints = [
    {
      title: "Kişisel Bilgiler ve Hedefler",
      description: "Hedeflediğin TYT/AYT netleri, YKS tarihin ve mentörüne yazdığın biyografin.",
      icon: Database
    },
    {
      title: "Kitap ve Kaynak Verileri",
      description: "Çözdüğün kitapların branşları, öncelik seviyeleri ve senin eklediğin özel notlar.",
      icon: Database
    },
    {
      title: "Deneme Performansları",
      description: "Netlerin, çözüm sürelerin, deneme zorluk seviyeleri, doğru/yanlış sayıların ve branş/konu analizlerin.",
      icon: Eye
    },
    {
      title: "Hatalı Konular",
      description: "Denemelerde hangi konularda yanlış yaptığın ve bu hataların sıklığı.",
      icon: AlertCircle
    },
    {
      title: "Çalışma Geçmişi ve Notlar",
      description: "Geçmişte hangi görevleri tamamladığın, kaç dakika çalıştığın ve her güne dair tuttuğun günlük notlar (engeller, ortam durumu vb.).",
      icon: Lock
    },
    {
      title: "Geri Bildirimler",
      description: "Tamamladığın görevlere eklediğin 'senin notun' kısımları (örn: 'bu konuyu anlamadım' veya 'çok ses vardı').",
      icon: ShieldCheck
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">YZ Hakkında</h2>
        <p className="text-foreground/60 max-w-2xl">
          YKS Mentor AI'nın senin için en iyi programı hazırlamak ve sana en doğru tavsiyeleri vermek için hangi verilere eriştiğini buradan görebilirsin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dataPoints.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card p-6 bg-secondary/20 border-border/50 hover:border-primary/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <point.icon size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">{point.title}</h3>
            <p className="text-sm text-foreground/50 leading-relaxed">{point.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="card p-8 bg-primary/5 border-primary/20 space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="text-primary" size={24} />
          <h3 className="text-xl font-bold">Program Oluşturma Mantığı</h3>
        </div>
        
        <p className="text-sm text-foreground/70 leading-relaxed italic">
          Yapay zeka, sana özel programı oluştururken şu öncelik sırasını ve verileri kullanır:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background/50 border border-border/50">
            <p className="font-bold text-sm mb-1">1. Deneme Analizi</p>
            <p className="text-xs text-foreground/50">Son denemelerdeki 'Hatalı Konular' ve 'Net Trendleri' en büyük önceliktir. Yapay zeka, en çok yanlış yaptığın konuları otomatik olarak programa dahil eder.</p>
          </div>
          <div className="p-4 rounded-xl bg-background/50 border border-border/50">
            <p className="font-bold text-sm mb-1">2. Kitap Öncelikleri</p>
            <p className="text-xs text-foreground/50">Kaynaklar sekmesinde 'Yüksek Öncelikli' olarak işaretlediğin kitaplara ve az ilerleme kaydettiğin derslere ağırlık verilir.</p>
          </div>
          <div className="p-4 rounded-xl bg-background/50 border border-border/50">
            <p className="font-bold text-sm mb-1">3. Süre Yönetimi</p>
            <p className="text-xs text-foreground/50">Denemelerde harcadığın süreler analiz edilerek, yavaş kaldığın branşlar için özel pratik görevleri önerilir.</p>
          </div>
          <div className="p-4 rounded-xl bg-background/50 border border-border/50">
            <p className="font-bold text-sm mb-1">4. Stratejik Zamanlama (Geri Sayım)</p>
            <p className="text-xs text-foreground/50">YKS'ye kalan gün sayısına göre strateji değişir: Uzun vadede konu öğrenimi, orta vadede branş denemeleri/tekrarlar, son dönemde ise yoğun 'deneme-analiz-hata giderme' döngüsü uygulanır.</p>
          </div>
          <div className="p-4 rounded-xl bg-background/50 border border-border/50">
            <p className="font-bold text-sm mb-1">5. Kişisel Notlar & Sohbet</p>
            <p className="text-xs text-foreground/50">Mentörle yaptığın son konuşmalar ve 'Günlük Notlar' kısmındaki yorgunluk, motivasyon veya çevresel engeller programın yoğunluğunu ayarlar.</p>
          </div>
        </div>
      </div>

      <div className="card p-8 bg-secondary/10 border-border space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-primary" size={24} />
          <h3 className="text-xl font-bold">Veri Gizliliği ve Güvenlik</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="shrink-0 mt-1">
              <CheckCircle2 className="text-green-500" size={18} />
            </div>
            <div>
              <p className="font-bold">Verilerin Lokaldir</p>
              <p className="text-sm text-foreground/60">Girdiğin tüm veriler tarayıcının yerel depolamasında (IndexedDB) saklanır. Bizim sunucularımıza gitmez.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 mt-1">
              <CheckCircle2 className="text-green-500" size={18} />
            </div>
            <div>
              <p className="font-bold">Yapay Zeka Erişimi</p>
              <p className="text-sm text-foreground/60">Verilerin sadece sen 'Program Oluştur', 'Analiz Et' veya 'Mentörle Sohbet Et' dediğinde Google Gemini API'sine şifreli bir şekilde gönderilir ve yanıt alındıktan sonra Gemini tarafında (eğer Google'ın standart politikalarını kullanıyorsan) veri eğitimi için kullanılmaz.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 mt-1">
              <CheckCircle2 className="text-green-500" size={18} />
            </div>
            <div>
              <p className="font-bold">Şeffaflık</p>
              <p className="text-sm text-foreground/60">AI'ya gönderilen veriler her zaman yukarıdaki liste ile sınırlıdır. Gereksiz hiçbir veri paylaşımı yapılmaz.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
