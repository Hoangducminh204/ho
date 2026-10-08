# Business Requirements Document — Cổng sinh viên VJU (Site Sinh viên)

**Phiên bản:** 1.0 (dự thảo) · **Ngày:** 06/10/2026 · **Nguồn:** mockup `sinh-vien.html`, `styles.css`, `app.js`

---

## 1. Tổng quan

### 1.1 Bối cảnh và mục tiêu
Sinh viên Trường Đại học Việt Nhật (VJU) hiện phải dùng nhiều hệ thống rời rạc (cổng đào tạo, nhập điểm, email, thu học phí). Cổng sinh viên là điểm truy cập duy nhất để sinh viên tự tra cứu, đăng ký, thanh toán và gửi yêu cầu, giảm tải cho Phòng Đào tạo, KHTC, CTSV và Trung tâm CNTT.

**Mục tiêu kinh doanh**
- BO-1: Sinh viên tự phục vụ ≥ 90% nghiệp vụ học vụ thông thường mà không cần đến phòng ban.
- BO-2: Đảm bảo tuân thủ quy định học phí (QĐ 292/QĐ-ĐHVN) bằng cơ chế ràng buộc tự động.
- BO-3: Tăng tỷ lệ hoàn thành khảo sát chất lượng (chung, giảng viên, môn học) lên gần 100%.
- BO-4: Giảm sai sót đăng ký học phần (trùng lịch, vượt/thiếu tín chỉ, hết chỗ).
- BO-5: Dùng được trên máy tính, máy tính bảng và điện thoại.

### 1.2 Phạm vi
**Trong phạm vi:** site Sinh viên (7 nhóm chức năng ở mục 4). **Ngoài phạm vi:** site Giảng viên, Chuyên viên, CVHT, Điều phối, GĐ CTĐT, Super Admin (chỉ chuyển site qua menu); xử lý thanh toán thật (mockup mô phỏng).

### 1.3 Các bên liên quan
| Bên liên quan | Vai trò / Lợi ích |
|---|---|
| Sinh viên | Người dùng chính |
| Phòng Đào tạo | Chủ sở hữu CTĐT, đăng ký học phần, hồ sơ, giấy tờ |
| Phòng KHTC | Học phí, học bổng, hóa đơn |
| Phòng Khảo thí | Lịch thi, phúc khảo |
| Phòng CTSV | Hồ sơ, điểm rèn luyện, KTX |
| Trung tâm CNTT | Tài khoản, SSO, hỗ trợ kỹ thuật |

---

## 2. Đối tượng người dùng
Sinh viên đại học chính quy (ví dụ: K2021–K2022, CTĐT Khoa học và Kỹ thuật máy tính CLC), có thể học ngành 2/bằng kép hoặc có điểm từ trường gửi. Đăng nhập qua VJUHub SSO (Google Workspace). Giao diện chính: tiếng Việt, có chuyển đổi VI/EN.

---

## 3. Quy tắc nghiệp vụ xuyên suốt

| Mã | Quy tắc |
|---|---|
| BR-01 | **Cổng chặn sử dụng:** khi chưa hoàn thành *Khảo sát chung đầu năm học* hoặc *chưa đóng học phí đúng hạn*, hệ thống hiển thị hộp thoại yêu cầu hoàn tất. |
| BR-02 | **Khóa chức năng khi nợ học phí:** chỉ được dùng *Hồ sơ cá nhân*, *Học phí* và *Dịch vụ & hỗ trợ*. *Trang chủ*, *Học tập*, *Đăng ký học phần* bị làm mờ, không truy cập được. |
| BR-03 | **Chế tài chậm nộp học phí (Điều 9, QĐ 292):** quá hạn > 20 ngày → cảnh cáo và mất quyền xét học bổng kỳ sau; > 30 ngày → đình chỉ thi kết thúc học phần. |
| BR-04 | **Khảo sát theo môn:** điểm thành phần chỉ hiện sau khi sinh viên gửi *Khảo sát đánh giá giảng viên*; điểm kết thúc học phần chỉ hiện sau khi gửi *Khảo sát đánh giá môn học*. |
| BR-05 | **Điểm F:** học phần có điểm hệ 10 < 4.0 bị đánh giá Không đạt (F), không tính tín chỉ tích lũy; hiển thị đỏ toàn dòng kèm lý do. Với học cải thiện, hệ thống giữ điểm cao hơn giữa hai lần học. |
| BR-06 | **Học phí học lại/cải thiện** tính theo tín chỉ; học lần đầu theo CTĐT nằm trong học phí trọn gói theo kỳ, không tính thêm. |
| BR-07 | **Đối trừ học bổng** vào học phí chỉ áp dụng nếu quyết định học bổng ban hành *trước* ngày thông báo thu học phí (Điều 6.5); nếu sau, chi trả bằng chuyển khoản. |
| BR-08 | **Miễn/giảm học phí tiếng Anh:** chứng chỉ nộp trong 30 ngày kể từ nhập học mới được miễn học/thi và giảm trừ học phí (Điều 6.4.1). |
| BR-09 | **Thông tin định danh** (họ tên, ngày sinh, giới tính, CCCD, dân tộc) khóa chỉnh sửa trực tiếp, chỉ đổi qua yêu cầu xác nhận kèm minh chứng. |
| BR-10 | Các khoản phí dịch vụ (thẻ SV, bảng điểm, sao y, lễ phục) **không hoàn trả** trong mọi trường hợp. |

---

## 4. Yêu cầu chức năng

### 4.1 Trang chủ
- FR-1.1 Hiển thị 4 chỉ số: GPA tích lũy, tín chỉ kỳ này, công nợ học phí (kèm hạn), số việc cần làm (kèm số quá hạn).
- FR-1.2 Danh sách *Việc cần làm* (nộp học phí, đăng ký cải thiện sắp đóng, khảo sát, giấy tờ sẵn sàng) với nhãn trạng thái.
- FR-1.3 *Lịch học hôm nay* và *Thông báo mới* (nguồn phát hành: Phòng ĐT, KHTC, Khảo thí).

### 4.2 Hồ sơ cá nhân
- FR-2.1 Xem hồ sơ: thông tin cá nhân, gia đình, kết quả học tập theo kỳ; tab in sơ yếu lý lịch (A4, song ngữ, có dấu điện tử, tải PDF).
- FR-2.2 Cập nhật hồ sơ: liên hệ (email ĐHQGHN, email khác, điện thoại), địa chỉ (quê quán, nơi sinh, hộ khẩu, nơi ở, địa chỉ liên lạc, có tùy chọn "giống…"), thông tin khác (nhóm máu, chiều cao, đối tượng chính sách…), thông tin bố/mẹ.
- FR-2.3 Gửi *yêu cầu xác nhận đổi thông tin định danh* (trường cần sửa, giá trị đúng, minh chứng, ghi chú) và xem *lịch sử cập nhật* với trạng thái chờ duyệt/đã áp dụng.

### 4.3 Học tập
**Thời khóa biểu**
- FR-3.1 Ba chế độ xem: lịch tháng, lịch tuần (trục giờ 07:00–20:00), bảng chi tiết theo học phần; chọn kỳ học; xuất Excel, in.
- FR-3.2 Phân biệt 4 trạng thái bằng màu: có lịch học, đổi lịch/phòng, học bù, lịch thi.
- FR-3.3 Bấm một ngày hiển thị chi tiết: giờ, tiết, địa điểm, giảng viên, lý do thay đổi.
- FR-3.4 Bảng chi tiết hiển thị hình thức giảng dạy, điểm, số buổi vắng, trạng thái thi, nút gửi phản hồi.

**Đăng ký học phần**
- FR-3.5 Bốn tab: đăng ký chung, học tự do, học lại, học cải thiện; lọc theo khối kiến thức và tìm mã/tên học phần.
- FR-3.6 Bảng chọn môn hiển thị: Mã HP, Tên, TC, Trạng thái (Mở / Hết chỗ / Trùng lịch / Đã ĐK). Bấm tên học phần xem chi tiết lớp, giảng viên, sĩ số, lịch và phòng.
- FR-3.7 Hệ thống tự phát hiện trùng lịch (cùng thứ, tiết chồng lấn) với môn đã ĐK và môn đang chọn; bấm nhãn "Trùng lịch" xem môn xung đột.
- FR-3.8 Không cho chọn lớp hết chỗ; môn đã ghi nhận chỉ bỏ chọn được ở *Giỏ đăng ký*.
- FR-3.9 *Giỏ đăng ký* liệt kê môn đã ĐK, môn mới chọn, môn "Sẽ hủy"; thanh tổng hiển thị số HP, TC và học phí phát sinh.
- FR-3.10 Kiểm soát giới hạn **14–45 TC**/kỳ và đợt đăng ký mở (10/09 → 20/09/2025).
- FR-3.11 Màn hình xác nhận trước khi *Ghi nhận*; in phiếu đăng ký.

**Kết quả học tập**
- FR-3.12 Tab ngành 1 / ngành 2 (bằng kép) / trường gửi; tab điểm chi tiết và điểm tổng hợp theo kỳ (GPA, CPA, điểm rèn luyện, TC tích lũy, TC nợ, TC đã ĐK).
- FR-3.13 Điểm chi tiết gom nhóm theo học kỳ (thu gọn/mở), tìm kiếm, lọc kỳ; cột điểm thường xuyên, giữa kỳ, thành phần, cuối kỳ, hệ 10, chữ, hệ 4.
- FR-3.14 Nút *Chi tiết* mở lý do/trạng thái; nút *Phúc khảo* (với học phần cho phép) tự điền sẵn biểu mẫu *Gửi yêu cầu trợ giúp*.
- FR-3.15 Xuất bảng điểm PDF và bảng điểm tiếng Anh.

**Lịch thi:** danh sách theo kỳ (học phần, lớp, ngày, ca, giờ, phòng, SBD, hình thức); đồng bộ lên thời khóa biểu.

**Chương trình đào tạo**
- FR-3.16 Hiển thị khung 152 TC theo khối kiến thức (chung, lĩnh vực, khối ngành, nhóm ngành, chuyên ngành), nhóm tự chọn kèm điều kiện (số TC/số nhóm tối thiểu).
- FR-3.17 Trạng thái từng học phần: Đã đạt (kèm điểm chữ), Chưa đạt, Chưa học, *Có thể ĐK* (đã đủ tiên quyết); lọc, tìm, thu gọn khối; xuất PDF.

**Tiến độ tốt nghiệp:** TC tích lũy so với yêu cầu, GPA tối thiểu, môn bắt buộc còn thiếu, chứng chỉ chuẩn đầu ra (GDTC, ngoại ngữ, QP-AN), cảnh báo điều kiện còn thiếu.

**Đề cương môn học:** tra cứu, xem file đề cương (tên tệp, dung lượng, ngày tải), lọc theo khối kiến thức. **Điểm rèn luyện:** xem theo kỳ và xếp loại.

### 4.4 Học phí
- FR-4.1 *Công nợ học phí:* số còn nợ, hạn nộp, cảnh báo chế tài (BR-03), bảng chi tiết khoản thu có hộp chọn để tính lại "Còn phải nộp"; bảng công nợ các khoản phí và trạng thái đã thanh toán.
- FR-4.2 *TT học phí:* hai chế độ *Học phí kỳ* và *Học lại / cải thiện* (danh sách học phần, đơn giá/TC, thành tiền, hạn nộp, trạng thái); nút thanh toán trực tuyến.
- FR-4.3 *Lịch sử giao dịch:* mã giao dịch, ngày, nội dung, số tiền, phương thức, trạng thái; xem/tải **hóa đơn điện tử** (VNPT Invoice, gửi email sau thanh toán thành công).
- FR-4.4 *Học bổng:* danh sách học bổng đã/đang nhận (loại, kỳ, số tiền, phương thức chi trả, ngày QĐ), thông tin miễn trừ học phí tiếng Anh, điều kiện xét; nút *Đăng ký xét học bổng*.
- FR-4.5 Thanh toán thành công tự động mở khóa chức năng (BR-02) và thêm dòng vào lịch sử giao dịch.

### 4.5 Dịch vụ & hỗ trợ
- FR-5.1 *Yêu cầu giấy tờ:* chọn loại (bảng điểm VI/EN, giấy xác nhận SV, xác nhận vay vốn), số bản, hình thức nhận (bản ký số miễn phí hoặc dấu mộc tại Mỹ Đình/Hòa Lạc), lý do; theo dõi trạng thái và tải về.
- FR-5.2 *Danh sách biểu mẫu:* lọc theo nhóm, tải DOCX/PDF.
- FR-5.3 *Gửi yêu cầu trợ giúp:* danh mục, tiêu đề, mô tả, minh chứng; theo dõi trạng thái xử lý.
- FR-5.4 *Hướng dẫn:* hướng dẫn theo chức năng, FAQ, đầu mối liên hệ các phòng ban.
- FR-5.5 *Tài khoản & bảo mật:* thông tin đăng nhập SSO, tự đặt lại mật khẩu (Gmail VJU, cổng đào tạo, hệ thống nhập điểm), thông tin tài khoản email ĐHQGHN.

### 4.6 Tiện ích hệ thống
Menu hai cấp, thanh tab đa trang kiểu trình duyệt, tìm kiếm toàn cục, thông báo, chuyển ngôn ngữ VI/EN, chuyển site, tùy biến giao diện (phông, cỡ, màu, mật độ bảng).

---

## 5. Yêu cầu phi chức năng
| Mã | Yêu cầu |
|---|---|
| NFR-1 | **Đáp ứng thiết bị:** từ 360px đến màn hình rộng; bảng học vụ cuộn ngang, không tràn trang; vùng chạm ≥ 32px trên màn cảm ứng. |
| NFR-2 | **Bảo mật:** xác thực SSO; sinh viên chỉ xem dữ liệu của chính mình; không hiển thị mật khẩu ở dạng văn bản rõ trong môi trường chính thức. |
| NFR-3 | **Hiệu năng:** trang tra cứu tải ≤ 3 giây; chịu tải cao điểm đợt đăng ký học phần. |
| NFR-4 | **Toàn vẹn dữ liệu:** kiểm tra chỗ trống và trùng lịch phía máy chủ tại thời điểm ghi nhận. |
| NFR-5 | **Khả dụng:** ≥ 99,5%, đặc biệt trong đợt đăng ký và hạn nộp học phí. |
| NFR-6 | **Kiểm toán:** lưu vết đăng ký/hủy, thanh toán, thay đổi hồ sơ. |
| NFR-7 | **Dễ dùng:** màu nhấn đỏ VJU, trạng thái dùng chấm màu; chữ rõ, tương phản đủ. |

---

## 6. Tích hợp
VJUHub SSO (Google Workspace) · CSDL đào tạo/điểm (legacy) · Cổng thanh toán và ngân hàng (BIDV) · VNPT Invoice · Hệ thống email ĐHQGHN (idp.vnu.edu.vn).

---

## 7. Tiêu chí chấp nhận (mẫu)
1. Sinh viên có học phí quá hạn truy cập *Kết quả học tập* → hệ thống hiện hộp thoại nhắc đóng học phí, không chuyển trang.
2. Sinh viên chọn môn trùng tiết với môn đã ĐK → hàng chuyển trạng thái "Trùng lịch", không tick được.
3. Tổng TC sau ghi nhận ngoài 14–45 → không cho Ghi nhận (cần bổ sung khi triển khai).
4. Sau khi gửi khảo sát giảng viên, điểm thành phần của học phần đó hiển thị.
5. Sau khi thanh toán thành công, menu được mở khóa và có hóa đơn trong lịch sử giao dịch.
6. Môn F hiển thị màu đỏ và có lý do không đạt trong popup *Chi tiết*.

---

## 8. Giả định, ràng buộc và vấn đề cần làm rõ
Mockup có một số số liệu chưa thống nhất, cần chốt với nghiệp vụ trước khi phát triển:

| # | Vấn đề |
|---|---|
| 1 | Số tiền học phí kỳ HK1 khác nhau giữa các màn: 29.000.000đ (Trang chủ), 25.320.000đ (Công nợ), 22.080.000đ (TT học phí/cổng chặn). |
| 2 | Đơn giá học lại/cải thiện: 810.000đ/TC (Học phí) và 550.000đ/TC (Đăng ký học phần). |
| 3 | TC tích lũy: 123 (Kết quả học tập, Trang chủ) và 118 (CTĐT, Tiến độ tốt nghiệp). |
| 4 | GPA: 2.78 (Kết quả học tập) và 3.42 (Hồ sơ), điều kiện học bổng yêu cầu GPA kỳ ≥ 3.20 nhưng chưa nêu rõ dùng GPA kỳ hay tích lũy. |
| 5 | Số môn bắt buộc còn thiếu: thông báo ghi 2, thẻ thống kê ghi 3. |
| 6 | Thiếu quy tắc chi tiết cho: hủy đăng ký sau đợt, xử lý tín chỉ tối thiểu/tối đa khi nợ môn, điều kiện tiên quyết khi đăng ký, phúc khảo (hạn, phí). |
| 7 | Cổng chặn và hộp "Demo: đặt lại trạng thái" chỉ phục vụ mockup, không đưa vào bản chính thức. |
| 8 | Dữ liệu mockup lưu bằng localStorage; bản thật phải lưu trạng thái ở máy chủ. |

---

## 9. Phụ lục — Thuật ngữ
**HP** học phần · **TC** tín chỉ · **CTĐT** chương trình đào tạo · **CVHT** cố vấn học tập · **KKHT** khuyến khích học tập · **GPA/CPA** điểm trung bình kỳ/tích lũy · **SBD** số báo danh · **QĐ 292** Quy định về học phí và các khoản phí đào tạo.
