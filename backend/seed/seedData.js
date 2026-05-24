require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Combo = require('../models/Combo');
const Blog = require('../models/Blog');
const User = require('../models/User');
const slugify = require('../utils/slugify');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/herbre_db';

const products = [
  {
    name: 'Túi ngâm chân Ngải Cứu Himalaya',
    slug: 'tui-ngam-chan-ngai-cuu-himalaya',
    shortDesc: 'Ngải cứu + Gừng + Muối hồng — thư giãn, kích thích tuần hoàn',
    description: 'Hỗn hợp ngải cứu sấy khô, gừng thái lát, muối hồng Himalaya và tinh dầu tràm. Chỉ cần thêm nước nóng 40-45°C, ngâm 20 phút mỗi tối để giảm mệt mỏi, kích thích tuần hoàn máu, an thần nhẹ và khử mùi hiệu quả.',
    category: 'ngam-chan',
    ingredients: [
      { name: 'Ngải cứu khô', benefit: 'Kháng viêm, giảm đau, an thần' },
      { name: 'Gừng tươi', benefit: 'Làm ấm, kích thích tuần hoàn' },
      { name: 'Muối hồng Himalaya', benefit: 'Khử độc, làm mềm da' },
      { name: 'Tinh dầu tràm', benefit: 'Kháng khuẩn, thơm mát' }
    ],
    usage: 'Đun sôi 1-2 lít nước, thêm 1 túi ngâm chân, để nguội 40-45°C. Ngâm chân 20-30 phút trước khi ngủ.',
    weight: '80g/túi, hộp 10 túi',
    price: 89000,
    originalPrice: 120000,
    stock: 200,
    sold: 1250,
    emoji: '🦶',
    tags: ['Giảm mệt mỏi', 'An thần', 'Khử mùi', 'Tuần hoàn máu'],
    badge: 'Bán chạy',
    isFeatured: true,
    benefits: ['Kích thích tuần hoàn máu', 'Giảm mệt mỏi sau ngày dài', 'Khử mùi chân hiệu quả', 'An thần, dễ ngủ']
  },
  {
    name: 'Túi ngâm chân Bạc Hà Sả Lá Chanh',
    slug: 'tui-ngam-chan-bac-ha-sa-la-chanh',
    shortDesc: 'Bạc hà + Sả + Lá chanh — thanh mát, kháng khuẩn',
    description: 'Kết hợp bạc hà tươi, sả, lá chanh và muối biển. Hương thơm thanh mát, kháng khuẩn mạnh, trị nứt gót chân và làm trắng da chân. Phù hợp dùng ban ngày hoặc mùa hè.',
    category: 'ngam-chan',
    ingredients: [
      { name: 'Bạc hà', benefit: 'Thanh mát, giảm đau' },
      { name: 'Sả', benefit: 'Kháng khuẩn, khử mùi' },
      { name: 'Lá chanh', benefit: 'Dưỡng da, làm sáng' },
      { name: 'Muối biển', benefit: 'Tẩy tế bào chết' }
    ],
    usage: 'Pha nước 38-42°C, ngâm 15-20 phút. Có thể dùng buổi sáng hoặc tối.',
    weight: '75g/túi, hộp 10 túi',
    price: 85000,
    originalPrice: null,
    stock: 180,
    sold: 860,
    emoji: '🌿',
    tags: ['Kháng khuẩn', 'Mát lạnh', 'Nứt gót', 'Dưỡng da'],
    badge: 'Mới',
    benefits: ['Kháng khuẩn hiệu quả', 'Trị nứt gót chân', 'Làm trắng da chân', 'Thanh mát dịu nhẹ']
  },
  {
    name: 'Túi chườm ấm Gừng Nghệ Đinh Hương',
    slug: 'tui-chuom-am-gung-nghe-dinh-huong',
    shortDesc: 'Gừng + Nghệ + Đinh hương — ấm bụng, giảm đau bụng kinh',
    description: 'Hỗn hợp gừng khô, nghệ vàng, đinh hương, quế chi và hạt ngò. Làm ấm bụng sâu, giảm đau bụng kinh, hỗ trợ tiêu hoá và chướng bụng. Có thể dùng chườm nóng hoặc pha uống.',
    category: 'am-bung',
    ingredients: [
      { name: 'Gừng khô', benefit: 'Làm ấm, chống nôn' },
      { name: 'Nghệ vàng', benefit: 'Kháng viêm, tốt cho dạ dày' },
      { name: 'Đinh hương', benefit: 'Giảm đau, kháng khuẩn' },
      { name: 'Quế chi', benefit: 'Làm ấm cơ thể, thơm miệng' }
    ],
    usage: 'Đặt túi lên bụng + dùng túi chườm nóng 10-15 phút. Hoặc pha 1 túi với 200ml nước sôi, uống khi còn ấm.',
    weight: '60g/túi, hộp 8 túi',
    price: 95000,
    originalPrice: 130000,
    stock: 150,
    sold: 980,
    emoji: '🌡️',
    tags: ['Ấm bụng', 'Tiêu hoá', 'Đau bụng kinh', 'Chướng bụng'],
    badge: 'Bán chạy',
    isFeatured: true,
    benefits: ['Giảm đau bụng kinh', 'Hỗ trợ tiêu hoá', 'Ấm bụng sâu', 'Giảm chướng bụng đầy hơi']
  },
  {
    name: 'Trà ấm bụng Hương Quế Gừng',
    slug: 'tra-am-bung-huong-que-gung',
    shortDesc: 'Quế chi + Gừng khô + Hồi + Cam thảo',
    description: 'Hỗn hợp quế chi, gừng khô, hồi hương, cam thảo và thảo quả. Uống mỗi sáng hoặc sau bữa ăn để giữ ấm cơ thể, hỗ trợ tiêu hoá, giảm đầy bụng và tăng cảm giác ngon miệng.',
    category: 'am-bung',
    ingredients: [
      { name: 'Quế chi', benefit: 'Làm ấm, hỗ trợ đường huyết' },
      { name: 'Gừng khô', benefit: 'Ấm bụng, chống nôn' },
      { name: 'Cam thảo', benefit: 'Ngọt tự nhiên, bổ tỳ vị' },
      { name: 'Thảo quả', benefit: 'Thơm miệng, tiêu hoá tốt' }
    ],
    usage: 'Pha 1 túi với 250ml nước sôi, ủ 5 phút. Uống 1-2 lần/ngày sau bữa ăn.',
    weight: '3g/túi, hộp 20 túi',
    price: 75000,
    originalPrice: null,
    stock: 300,
    sold: 640,
    emoji: '🍵',
    tags: ['Uống hàng ngày', 'Ấm người', 'Tiêu hoá', 'Sau bữa ăn'],
    benefits: ['Giữ ấm cơ thể', 'Hỗ trợ tiêu hoá', 'Giảm đầy bụng', 'Tăng ngon miệng']
  },
  {
    name: 'Trà giải độc Atiso Diệp Hạ Châu',
    slug: 'tra-giai-doc-atiso-diep-ha-chau',
    shortDesc: 'Atiso + Diệp hạ châu + Râu ngô — mát gan, giải độc',
    description: 'Kết hợp atiso đà lạt, diệp hạ châu, râu ngô và mã đề. Hỗ trợ chức năng gan, thận, thanh lọc cơ thể, giảm mụn từ bên trong. Phù hợp người ăn nhiều thịt, uống bia rượu, da nóng trong.',
    category: 'giai-doc',
    ingredients: [
      { name: 'Atiso Đà Lạt', benefit: 'Bảo vệ gan, tăng tiết mật' },
      { name: 'Diệp hạ châu', benefit: 'Hỗ trợ gan, kháng virus' },
      { name: 'Râu ngô', benefit: 'Lợi tiểu, giải nhiệt' },
      { name: 'Mã đề', benefit: 'Thận khoẻ, lọc máu' }
    ],
    usage: 'Pha 1 túi với 300ml nước sôi, ủ 7 phút. Uống 2 lần/ngày, trước bữa ăn. Uống liên tục 1 tháng để thấy hiệu quả.',
    weight: '5g/túi, hộp 20 túi',
    price: 110000,
    originalPrice: 150000,
    stock: 120,
    sold: 1560,
    emoji: '🌸',
    tags: ['Gan khoẻ', 'Giải độc', 'Mát gan', 'Trị mụn'],
    badge: 'Hot',
    isFeatured: true,
    benefits: ['Hỗ trợ chức năng gan', 'Thanh lọc cơ thể', 'Giảm mụn từ bên trong', 'Mát gan, giải nhiệt']
  },
  {
    name: 'Gối thảo dược Oải Hương Hoa Cúc',
    slug: 'goi-thao-duoc-oai-huong-hoa-cuc',
    shortDesc: 'Lavender + Hoa cúc + Bạc hà — thư giãn, giảm đau đầu',
    description: 'Gối nhỏ nhồi hoa oải hương, hoa cúc la mã, lá bạc hà và hạt mùi. Đặt cạnh đầu giường hoặc áp nhẹ lên trán để giảm đau đầu, giảm stress, thư giãn tinh thần sau ngày dài.',
    category: 'thu-gian',
    ingredients: [
      { name: 'Hoa oải hương', benefit: 'An thần, giảm lo âu' },
      { name: 'Hoa cúc la mã', benefit: 'Thư giãn, chống viêm' },
      { name: 'Bạc hà', benefit: 'Giảm đau đầu, tỉnh táo' },
      { name: 'Hạt mùi', benefit: 'Hương thơm cân bằng' }
    ],
    usage: 'Đặt gối cạnh đầu hoặc áp nhẹ lên trán/mắt 15-20 phút. Bóp nhẹ để tỏa hương. Hiệu lực hương thơm kéo dài 3-6 tháng.',
    weight: '150g/gối',
    price: 135000,
    originalPrice: 180000,
    stock: 80,
    sold: 430,
    emoji: '💆',
    tags: ['Thư giãn', 'Đau đầu', 'Stress', 'Hương thơm'],
    benefits: ['Giảm đau đầu căng thẳng', 'Thư giãn tinh thần', 'Giảm lo âu', 'Cải thiện tâm trạng']
  },
  {
    name: 'Gối ngủ Tâm Sen Lạc Tiên',
    slug: 'goi-ngu-tam-sen-lac-tien',
    shortDesc: 'Tâm sen + Lạc tiên + Hoa nhài — ngủ sâu, an thần',
    description: 'Tâm sen, lạc tiên, hoa nhài và vỏ chanh khô. Đặt cạnh đầu mỗi đêm giúp an thần nhẹ, dễ vào giấc, ngủ sâu giấc mà không gây phụ thuộc hay buồn ngủ ban ngày.',
    category: 'ngu-ngon',
    ingredients: [
      { name: 'Tâm sen', benefit: 'An thần, dưỡng tâm' },
      { name: 'Lạc tiên', benefit: 'Giảm mất ngủ, lo âu' },
      { name: 'Hoa nhài', benefit: 'Hương thơm dễ chịu' },
      { name: 'Vỏ chanh khô', benefit: 'Thanh nhiệt, thơm mát' }
    ],
    usage: 'Đặt gối cạnh đầu giường. Bóp nhẹ trước khi ngủ để kích thích hương thơm. Dùng đều đặn 1-2 tuần để thấy hiệu quả.',
    weight: '180g/gối',
    price: 145000,
    originalPrice: 200000,
    stock: 90,
    sold: 780,
    emoji: '😴',
    tags: ['Ngủ ngon', 'An thần', 'Không thuốc', 'Mất ngủ'],
    badge: 'Bán chạy',
    isFeatured: true,
    benefits: ['Dễ vào giấc ngủ', 'Ngủ sâu không thức giữa đêm', 'Không gây phụ thuộc', 'An toàn cho mọi đối tượng']
  },
  {
    name: 'Muối tắm Hoa Hồng Tinh Dầu',
    slug: 'muoi-tam-hoa-hong-tinh-dau',
    shortDesc: 'Muối Himalaya + Hoa hồng + Lavender — dưỡng da, thư giãn',
    description: 'Muối biển Dead Sea, cánh hoa hồng sấy khô, tinh dầu lavender và bơ ca cao. Tắm 2-3 lần/tuần để dưỡng da mềm mịn, sáng khoẻ, thư giãn cơ bắp và thơm người cả ngày.',
    category: 'lam-dep',
    ingredients: [
      { name: 'Muối Dead Sea', benefit: 'Tẩy da chết, khoáng chất' },
      { name: 'Cánh hoa hồng', benefit: 'Dưỡng ẩm, chống oxy hoá' },
      { name: 'Tinh dầu Lavender', benefit: 'Thư giãn, kháng khuẩn' },
      { name: 'Bơ ca cao', benefit: 'Dưỡng ẩm sâu' }
    ],
    usage: 'Lấy 3-4 thìa muối hoà tan vào nước tắm ấm. Ngâm 15-20 phút. Dùng 2-3 lần/tuần.',
    weight: '300g/hũ',
    price: 120000,
    originalPrice: 160000,
    stock: 150,
    sold: 520,
    emoji: '🛁',
    tags: ['Dưỡng da', 'Thư giãn', 'Hoa hồng', 'Mềm da'],
    badge: 'Mới',
    benefits: ['Dưỡng da mềm mịn', 'Sáng đều màu da', 'Thư giãn cơ bắp', 'Hương thơm kéo dài']
  },
  {
    name: 'Trà thảo dược Collagen Hoa Hồi',
    slug: 'tra-thao-duoc-collagen-hoa-hoi',
    shortDesc: 'Collagen thực vật + Hoa hồi + Cam thảo — đẹp da từ bên trong',
    description: 'Collagen từ thực vật (thanh long, ổi), hoa hồi, cam thảo, mật ong đông khô. Uống đều đặn giúp tăng đàn hồi da, sáng da tự nhiên, cân bằng nội tiết tố.',
    category: 'lam-dep',
    ingredients: [
      { name: 'Collagen thực vật', benefit: 'Tăng đàn hồi, chống nhăn' },
      { name: 'Hoa hồi', benefit: 'Thơm, hỗ trợ nội tiết' },
      { name: 'Cam thảo', benefit: 'Làm sáng da, chống viêm' },
      { name: 'Mật ong đông khô', benefit: 'Kháng khuẩn, dưỡng ẩm' }
    ],
    usage: 'Pha 1 gói với 200ml nước ấm (không sôi). Uống 1 lần/ngày vào buổi sáng khi đói.',
    weight: '5g/gói, hộp 30 gói',
    price: 165000,
    originalPrice: 220000,
    stock: 100,
    sold: 310,
    emoji: '🌺',
    tags: ['Đẹp da', 'Collagen', 'Sáng da', 'Nội tiết'],
    badge: 'Hot',
    isFeatured: true,
    benefits: ['Tăng đàn hồi da', 'Sáng da tự nhiên', 'Cân bằng nội tiết', 'Chống lão hoá']
  },
  {
    name: 'Trà ngủ ngon Lạc Tiên Mật Ong',
    slug: 'tra-ngu-ngon-lac-tien-mat-ong',
    shortDesc: 'Lạc tiên + Tâm sen + Mật ong — uống trước ngủ',
    description: 'Lạc tiên, tâm sen, hoa cúc và mật ong rừng. Uống 1 ly ấm trước khi ngủ 30 phút giúp thư giãn tinh thần, giảm lo âu, dễ vào giấc và ngủ sâu hơn.',
    category: 'ngu-ngon',
    ingredients: [
      { name: 'Lạc tiên', benefit: 'An thần, giảm mất ngủ' },
      { name: 'Tâm sen', benefit: 'Dưỡng tâm, an thần' },
      { name: 'Hoa cúc', benefit: 'Thư giãn, chống stress' },
      { name: 'Mật ong rừng', benefit: 'Ngọt tự nhiên, kháng khuẩn' }
    ],
    usage: 'Pha 1 túi với 200ml nước 80°C, ủ 5 phút. Uống trước ngủ 30 phút.',
    weight: '5g/túi, hộp 20 túi',
    price: 98000,
    originalPrice: 130000,
    stock: 160,
    sold: 890,
    emoji: '🍯',
    tags: ['Ngủ ngon', 'An thần', 'Mật ong', 'Trước khi ngủ'],
    benefits: ['Dễ vào giấc', 'Giảm lo âu', 'Ngủ sâu giấc', 'Thư giãn tinh thần']
  }
];

const blogs = [
  {
    title: '5 thảo dược ngâm chân giúp ngủ ngon và giảm mệt mỏi hiệu quả',
    slug: '5-thao-duoc-ngam-chan-giup-ngu-ngon-va-giam-met-moi-hieu-qua',
    excerpt: 'Ngâm chân mỗi tối với ngải cứu, gừng, muối hồng... chỉ 20 phút mà mang lại nhiều lợi ích bất ngờ cho sức khoẻ.',
    content: `<h2>Tại sao nên ngâm chân bằng thảo dược?</h2>
<p>Theo y học cổ truyền, bàn chân là "bản đồ thu nhỏ" của cơ thể, nơi tập trung nhiều huyệt đạo quan trọng. Ngâm chân với thảo dược không chỉ giúp thư giãn cơ bắp mà còn kích thích tuần hoàn máu, cải thiện giấc ngủ và tăng cường sức đề kháng.</p>
<h2>5 thảo dược ngâm chân tốt nhất</h2>
<h3>1. Ngải Cứu (Artemisia vulgaris)</h3>
<p>Ngải cứu chứa nhiều tinh dầu và flavonoid có tác dụng kháng viêm, giảm đau và an thần nhẹ. Ngâm chân với ngải cứu đặc biệt hiệu quả với phụ nữ đau bụng kinh và người hay bị lạnh chân.</p>
<h3>2. Gừng tươi</h3>
<p>Gingerol trong gừng giúp làm ấm từ bên trong, kích thích tuần hoàn máu và có tác dụng kháng khuẩn nhẹ. Pha cùng muối biển để tăng hiệu quả.</p>
<h3>3. Muối hồng Himalaya</h3>
<p>Giàu khoáng chất như magie, kali, canxi. Giúp làm mềm da, khử độc qua lỗ chân lông và thư giãn cơ bắp.</p>
<h3>4. Sả và lá chanh</h3>
<p>Tác dụng kháng khuẩn, khử mùi rất tốt. Hương thơm của sả còn có tác dụng giảm stress và cải thiện tâm trạng.</p>
<h3>5. Bạc hà</h3>
<p>Menthol trong bạc hà tạo cảm giác mát lạnh dịu nhẹ, giảm đau và kháng nấm hiệu quả — đặc biệt phù hợp với người hay bị nứt gót chân.</p>
<h2>Hướng dẫn ngâm chân đúng cách</h2>
<p>Nhiệt độ nước lý tưởng: 40-45°C. Thời gian ngâm: 20-30 phút. Tốt nhất ngâm trước khi ngủ 1 giờ để cơ thể thư giãn hoàn toàn.</p>`,
    category: 'kien-thuc',
    tags: ['ngâm chân', 'ngải cứu', 'gừng', 'ngủ ngon'],
    emoji: '🦶',
    readTime: 5,
    isPublished: true,
    isFeatured: true,
    views: 2840,
    author: { name: 'DS. Nguyễn Thị Lan' }
  },
  {
    title: 'Gừng tươi – "vàng xanh" trong tủ thuốc gia đình người Việt',    slug: 'gung-tuoi-vang-xanh-trong-tu-thuoc-gia-dinh-nguoi-viet',    excerpt: 'Từ làm ấm bụng, chống say tàu xe đến giảm viêm, gừng là thảo dược đa năng mà nhà nào cũng cần.',
    content: `<h2>Gừng trong y học cổ truyền</h2>
<p>Gừng (Zingiber officinale) đã được sử dụng hơn 5.000 năm trong y học Á Đông và Ayurveda. Người Việt xem gừng là vị thuốc "vua" trong bếp thuốc gia đình.</p>
<h2>Các công dụng đã được khoa học chứng minh</h2>
<h3>Chống buồn nôn và say tàu xe</h3>
<p>Nghiên cứu từ Đại học Georgia (Mỹ) cho thấy gừng hiệu quả hơn cả thuốc chống say tàu xe thông thường trong nhiều trường hợp.</p>
<h3>Giảm đau và kháng viêm</h3>
<p>Gingerol — hoạt chất chính trong gừng tươi — có tác dụng ức chế enzyme COX-2 tương tự ibuprofen nhưng lành tính hơn với dạ dày.</p>
<h3>Làm ấm bụng, hỗ trợ tiêu hoá</h3>
<p>Gừng kích thích tiết dịch tiêu hoá, giảm đầy bụng, chướng hơi. Đặc biệt hiệu quả sau bữa ăn nhiều đạm hoặc dầu mỡ.</p>
<h2>Cách dùng gừng hàng ngày</h2>
<p>Trà gừng mật ong mỗi sáng, gừng thêm vào món ăn, hoặc túi ngâm chân gừng mỗi tối là những cách đơn giản nhất để tận dụng lợi ích của gừng.</p>`,
    category: 'suc-khoe',
    tags: ['gừng', 'tiêu hoá', 'ấm bụng', 'kháng viêm'],
    emoji: '🌿',
    readTime: 4,
    isPublished: true,
    views: 1920,
    author: { name: 'Đội ngũ Herbré' }
  },
  {
    title: 'Trà thảo dược mỗi sáng: thói quen nhỏ, thay đổi lớn cho làn da',
    slug: 'tra-thao-duoc-moi-sang-thoi-quen-nho-thay-doi-lon-cho-lan-da',
    excerpt: 'Chỉ một ly trà hoa cúc, atiso hay nghệ mật ong mỗi sáng có thể cải thiện làn da từ bên trong sau 4-8 tuần.',
    content: `<h2>Da đẹp bắt đầu từ bên trong</h2>
<p>90% vấn đề về da (mụn, thâm, xỉn màu) đều có nguồn gốc từ bên trong: gan hoạt động kém, ruột không khoẻ, nội tiết mất cân bằng. Thảo dược giúp giải quyết tận gốc những vấn đề này.</p>
<h2>3 loại trà tốt nhất cho da</h2>
<h3>Trà Atiso – giải độc gan</h3>
<p>Gan là cơ quan lọc độc tố chính của cơ thể. Khi gan hoạt động tốt, da tự nhiên sáng khoẻ, ít mụn hơn. Uống trà atiso 2 lần/ngày trong 1 tháng để thấy sự khác biệt.</p>
<h3>Trà Nghệ Mật Ong – chống oxy hoá</h3>
<p>Curcumin trong nghệ là chất chống oxy hoá mạnh, ức chế quá trình lão hoá da. Kết hợp với mật ong tăng khả năng hấp thu và ngon hơn.</p>
<h3>Trà Hoa Cúc – giảm viêm</h3>
<p>Apigenin trong hoa cúc giảm viêm nội tạng, giúp da bớt đỏ, bớt mụn viêm. Uống buổi tối còn giúp ngủ ngon hơn.</p>`,
    category: 'lam-dep',
    tags: ['trà thảo dược', 'đẹp da', 'atiso', 'nghệ'],
    emoji: '🍵',
    readTime: 6,
    isPublished: true,
    views: 3150,
    author: { name: 'Chuyên gia Trần Minh Anh' }
  },
  {
    title: 'Mất ngủ kinh niên: giải pháp từ thảo dược không cần thuốc',
    slug: 'mat-ngu-kinh-nien-giai-phap-tu-thao-duoc-khong-can-thuoc',
    excerpt: 'Hơn 30% người Việt bị rối loạn giấc ngủ. Tâm sen, lạc tiên và một số thảo dược tự nhiên có thể giúp bạn ngủ lại mà không lo tác dụng phụ.',
    content: `<h2>Tại sao không nên dùng thuốc ngủ lâu dài?</h2>
<p>Thuốc ngủ tổng hợp gây phụ thuộc và làm giảm chất lượng giấc ngủ REM — loại giấc ngủ sâu phục hồi cơ thể. Thảo dược tự nhiên tác động nhẹ nhàng hơn và không gây phụ thuộc.</p>
<h2>Thảo dược hỗ trợ giấc ngủ hiệu quả</h2>
<h3>Lạc tiên (Passiflora)</h3>
<p>Nghiên cứu lâm sàng cho thấy lạc tiên làm tăng GABA trong não — chất dẫn truyền thần kinh ức chế lo âu. Hiệu quả tương đương oxazepam liều nhỏ nhưng hoàn toàn tự nhiên.</p>
<h3>Tâm sen</h3>
<p>Alkaloid trong tâm sen (neferin, nuciferine) có tác dụng an thần, dưỡng tâm. Phù hợp người mất ngủ do lo nghĩ nhiều, stress công việc.</p>
<h3>Gối thảo dược</h3>
<p>Hít thở hương thơm lavender, hoa cúc trong khi ngủ kích thích vùng limbic não tiết serotonin và melatonin tự nhiên.</p>`,
    category: 'suc-khoe',
    tags: ['mất ngủ', 'tâm sen', 'lạc tiên', 'ngủ ngon'],
    emoji: '😴',
    readTime: 7,
    isPublished: true,
    isFeatured: true,
    views: 4200,
    author: { name: 'DS. Nguyễn Thị Lan' }
  },
  {
    title: 'Công thức tắm muối thảo dược tại nhà cho da mềm mịn như spa',
    slug: 'cong-thuc-tam-muoi-thao-duoc-tai-nha-cho-da-mem-min-nhu-spa',
    excerpt: 'Chỉ cần muối biển, hoa hồng và vài giọt tinh dầu, bạn có thể có buổi spa thư giãn tại nhà với chi phí rất thấp.',
    content: `<h2>Lợi ích của tắm muối thảo dược</h2>
<p>Tắm muối không chỉ làm sạch da mà còn cung cấp khoáng chất, tẩy tế bào chết nhẹ nhàng và thư giãn cơ bắp sâu. Khi kết hợp với thảo dược, hiệu quả tăng lên gấp nhiều lần.</p>
<h2>Công thức muối tắm hoa hồng lavender</h2>
<p><strong>Nguyên liệu:</strong> 300g muối Dead Sea, 50g cánh hoa hồng khô, 20ml tinh dầu lavender, 30ml dầu dừa nguyên chất.</p>
<p><strong>Cách làm:</strong> Trộn đều muối với dầu dừa trước, sau đó thêm cánh hoa hồng và tinh dầu. Bảo quản trong hũ thuỷ tinh kín.</p>
<h2>Cách tắm đúng để da hấp thu tốt nhất</h2>
<p>Tắm nước ấm 37-39°C. Dùng muối massage nhẹ nhàng theo chuyển động tròn từ chân lên. Ngâm 15 phút rồi xả nước mát để se khít lỗ chân lông.</p>`,
    category: 'cong-thuc',
    tags: ['tắm muối', 'hoa hồng', 'spa tại nhà', 'dưỡng da'],
    emoji: '🛁',
    readTime: 5,
    isPublished: true,
    views: 2100,
    author: { name: 'Đội ngũ Herbré' }
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công');

    // Clear existing data
    await Product.deleteMany({});
    await Combo.deleteMany({});
    await Blog.deleteMany({});
    await User.deleteMany({ role: 'admin' });
    console.log('🗑️  Đã xoá dữ liệu cũ');

    // Insert products
    const savedProducts = await Product.insertMany(products);
   
    console.log(`✅ Đã thêm ${savedProducts.length} sản phẩm`);

    // Create combos referencing products
    const ngamChan1 = savedProducts[0]; // Túi ngâm chân Ngải Cứu Himalaya
    const ngamChan2 = savedProducts[1]; // Túi ngâm chân Bạc Hà Sả Lá Chanh
    const chuomAm = savedProducts[2]; // Túi chườm ấm Gừng Nghệ Đinh Hương
    const traAmBung = savedProducts[3]; // Trà ấm bụng Hương Quế Gừng
    const giaiDoc = savedProducts[4]; // Trà giải độc Atiso Diệp Hạ Châu
    const goiOaiHuong = savedProducts[5]; // Gối thảo dược Oải Hương Hoa Cúc
    const goiNgu = savedProducts[6]; // Gối ngủ Tâm Sen Lạc Tiên
    const muoiTam = savedProducts[7]; // Muối tắm Hoa Hồng Tinh Dầu
    const traNguNgon = savedProducts[9]; // Trà ngủ ngon Lạc Tiên Mật Ong

    const combos = [
      {
        name: 'Bộ Thư Giãn Toàn Diện',
        slug: 'bo-thu-gian-toan-dien',
        tagline: 'Xua tan mệt mỏi sau ngày dài',
        label: 'Combo Thư Giãn',
        description: 'Kết hợp ngâm chân thảo dược, gối oải hương và trà ấm bụng để thư giãn toàn thân từ đầu đến chân.',
        items: [
          { product: ngamChan1._id, quantity: 2, name: ngamChan1.name },
          { product: goiOaiHuong._id, quantity: 1, name: goiOaiHuong.name },
          { product: traAmBung._id, quantity: 1, name: traAmBung.name }
        ],
        originalPrice: 468000,
        price: 369000,
        emoji: '💆',
        isFeatured: true,
        stock: 50
      },
      {
        name: 'Bộ Ngủ Sâu Giấc',
        slug: 'bo-ngu-sau-giac',
        tagline: 'Giải pháp mất ngủ hoàn toàn tự nhiên',
        label: 'Combo Ngủ Ngon',
        description: 'Trọn bộ cho người mất ngủ: ngâm chân bạc hà, gối tâm sen, trà ngủ ngon — hiệu quả sau 7 ngày.',
        items: [
          { product: goiNgu._id, quantity: 1, name: goiNgu.name },
          { product: ngamChan2._id, quantity: 2, name: ngamChan2.name },
          { product: traNguNgon._id, quantity: 1, name: traNguNgon.name }
        ],
        originalPrice: 413000,
        price: 325000,
        emoji: '😴',
        isFeatured: true,
        stock: 40
      },
      {
        name: 'Bộ Sức Khoẻ Gia Đình',
        slug: 'bo-suc-khoe-gia-dinh',
        tagline: 'Chăm sóc cả nhà mỗi ngày',
        label: 'Combo Gia Đình',
        description: 'Bộ đủ dùng cho cả gia đình: ngâm chân, chườm ấm, giải độc, tắm thảo dược.',
        items: [
          { product: ngamChan1._id, quantity: 3, name: ngamChan1.name },
          { product: chuomAm._id, quantity: 2, name: chuomAm.name },
          { product: giaiDoc._id, quantity: 2, name: giaiDoc.name },
          { product: muoiTam._id, quantity: 1, name: muoiTam.name }
        ],
        originalPrice: 897000,
        price: 669000,
        emoji: '🏠',
        isFeatured: true,
        stock: 30
      },
      {
        name: 'Bộ Đẹp Da Từ Bên Trong',
        slug: 'bo-dep-da-tu-ben-trong',
        tagline: 'Sáng da tự nhiên sau 4 tuần',
        label: 'Combo Làm Đẹp',
        description: 'Giải độc gan, tắm muối hoa hồng và trà collagen — làm đẹp toàn diện từ bên trong ra ngoài.',
        items: [
          { product: giaiDoc._id, quantity: 1, name: giaiDoc.name },
          { product: muoiTam._id, quantity: 2, name: muoiTam.name },
          { product: savedProducts[8]._id, quantity: 1, name: savedProducts[8].name }
        ],
        originalPrice: 515000,
        price: 399000,
        emoji: '🌸',
        stock: 35
      }
    ];

    await Combo.insertMany(combos);
    console.log(`✅ Đã thêm ${combos.length} combo`);

    // Insert blogs
    await Blog.insertMany(blogs);
    console.log(`✅ Đã thêm ${blogs.length} bài blog`);

    // Create admin user
    await User.create({
      name: 'Admin Herbré',
      email: 'admin@herbre.vn',
      password: 'Herbre@2025',
      role: 'admin',
      phone: '0912345678'
    });
    console.log('✅ Đã tạo tài khoản admin: admin@herbre.vn / Herbre@2025');

    console.log('\n🎉 Seed database hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi seed:', error);
    process.exit(1);
  }
}

seedDatabase();
