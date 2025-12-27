# 🐳 DOCKER ERROR - QUICK FIX

## ❌ ERROR:
```
ERROR: Cannot connect to the Docker daemon at unix:///Users/vietchung/.docker/run/docker.sock. 
Is the docker daemon running?
```

---

## ✅ GIẢI PHÁP:

### **Option 1: Khởi động Docker Desktop (RECOMMENDED)** ⭐

1. **Mở Docker Desktop:**
   ```
   Spotlight (Cmd+Space) → gõ "Docker" → Enter
   ```
   Hoặc:
   ```
   Applications → Docker.app
   ```

2. **Đợi Docker khởi động:**
   - Nhìn icon Docker ở menu bar (góc trên cùng bên phải)
   - Chờ icon Docker từ "animated" → "normal"
   - Thường mất ~30 giây

3. **Verify Docker đã chạy:**
   ```bash
   docker info
   ```
   Nếu thấy output → Docker OK ✅

4. **Chạy deploy script:**
   ```bash
   ./START_DOCKER_AND_DEPLOY.sh
   ```

---

### **Option 2: Khởi động từ Terminal**

```bash
# Mở Docker Desktop
open -a Docker

# Đợi 30 giây
sleep 30

# Check status
docker info

# Nếu OK → Deploy
./START_DOCKER_AND_DEPLOY.sh
```

---

### **Option 3: Restart Docker (nếu đang chạy nhưng lỗi)**

```bash
# Quit Docker
osascript -e 'quit app "Docker"'

# Đợi 5 giây
sleep 5

# Start lại
open -a Docker

# Đợi 30 giây
sleep 30

# Deploy
./START_DOCKER_AND_DEPLOY.sh
```

---

## 🔍 VERIFY DOCKER STATUS:

```bash
# Check Docker running
docker info

# Check Docker version
docker --version

# Check Docker Buildx
docker buildx version

# List Docker containers
docker ps
```

**Nếu tất cả commands trên chạy OK → Docker đã sẵn sàng!** ✅

---

## 🚀 DEPLOY SAU KHI FIX:

### **Cách 1: Dùng script check tự động (RECOMMENDED)**
```bash
./START_DOCKER_AND_DEPLOY.sh
```

Script này sẽ:
- ✅ Check Docker có chạy không
- ✅ Nếu không → Hiện hướng dẫn fix
- ✅ Nếu OK → Tự động chạy deploy

### **Cách 2: Chạy deploy trực tiếp**
```bash
./DEPLOY_FIX_LOCALHOST_FINAL.sh
```

---

## 🆘 NẾU VẪN LỖI:

### **Lỗi: "Cannot connect to Docker daemon"**

**Nguyên nhân:**
- Docker Desktop chưa khởi động
- Docker daemon crashed
- Permission issues

**Fix:**
1. Mở Activity Monitor (Cmd+Space → "Activity Monitor")
2. Tìm "Docker" processes
3. Nếu không thấy → Docker chưa chạy
4. Mở Docker Desktop lại
5. Đợi icon ổn định

---

### **Lỗi: "docker: command not found"**

**Nguyên nhân:** Docker Desktop chưa được cài đặt

**Fix:**
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Cài đặt
3. Khởi động Docker Desktop
4. Chạy lại deploy script

---

### **Lỗi: "permission denied"**

**Fix:**
```bash
# Add user to docker group (nếu cần)
sudo usermod -aG docker $USER

# Hoặc restart Docker Desktop
osascript -e 'quit app "Docker"'
sleep 5
open -a Docker
```

---

## ✅ CHECKLIST:

- [ ] Docker Desktop đã cài đặt
- [ ] Docker Desktop đang chạy (icon ổn định)
- [ ] `docker info` chạy OK
- [ ] `docker ps` chạy OK
- [ ] `docker buildx version` chạy OK

**Nếu tất cả OK → Chạy deploy! 🚀**

---

## 📋 QUICK COMMANDS:

```bash
# 1. Start Docker
open -a Docker && sleep 30

# 2. Verify
docker info

# 3. Deploy
./START_DOCKER_AND_DEPLOY.sh
```

---

**Total time to fix: ~1-2 phút**

**Sau đó deploy sẽ chạy bình thường! ✅**

