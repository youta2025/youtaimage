class ImageEditor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.originalImage = null;
        this.currentImage = null;
        this.watermarkPosition = 'bottom-right'; // 默认水印位置
        this.cropData = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            isDragging: false,
            isResizing: false,
            currentHandle: null,
            startX: 0,
            startY: 0
        };
        
        // 添加百度 AI 配置
        this.baiduAI = {
            apiKey: 'DYMyntOjJCTbCXCzHHQMbacq',
            secretKey: 'TsmmKFZquGdegjbLco8v3q4ugCVJ1EN5',
            accessToken: null,
            tokenExpires: 0
        };
    }

    initializeElements() {
        // 获取所有需要的DOM元素
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            uploadArea: document.getElementById('uploadArea'),
            editArea: document.getElementById('editArea'),
            previewImage: document.getElementById('previewImage'),
            downloadBtn: document.getElementById('downloadBtn'),
            
            // 尺寸调整元素
            resizeBtn: document.getElementById('resizeBtn'),
            widthInput: document.getElementById('widthInput'),
            heightInput: document.getElementById('heightInput'),
            
            // 压缩元素
            compressBtn: document.getElementById('compressBtn'),
            qualitySlider: document.getElementById('qualitySlider'),
            qualityValue: document.getElementById('qualityValue'),
            
            // 水印元素
            watermarkBtn: document.getElementById('watermarkBtn'),
            watermarkText: document.getElementById('watermarkText'),
            watermarkColor: document.getElementById('watermarkColor'),
            watermarkOpacity: document.getElementById('watermarkOpacity'),
            opacityValue: document.getElementById('opacityValue'),
            
            // 背景去除
            bgRemoveBtn: document.getElementById('bgRemoveBtn'),
            watermarkSize: document.getElementById('watermarkSize'),
            fontSizeValue: document.getElementById('fontSizeValue'),
            originalSize: document.getElementById('originalSize'),
            originalFileSize: document.getElementById('originalFileSize'),
            estimatedFileSize: document.getElementById('estimatedFileSize'),
            compressionRatio: document.getElementById('compressionRatio'),
            positionBtns: document.querySelectorAll('.position-btn'),
            
            // 添加裁剪相关元素
            cropCanvas: document.getElementById('cropCanvas'),
            cropFrame: document.getElementById('cropFrame'),
            cropBtn: document.getElementById('cropBtn'),
            cropWidth: document.getElementById('cropWidth'),
            cropHeight: document.getElementById('cropHeight'),
            cropArea: document.getElementById('cropArea')
        };
    }

    bindEvents() {
        // 上传相关事件
        this.elements.uploadArea.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.elements.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.elements.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 工具按钮事件
        this.elements.resizeBtn.addEventListener('click', () => this.resizeImage());
        this.elements.compressBtn.addEventListener('click', () => this.compressImage());
        this.elements.watermarkBtn.addEventListener('click', () => this.addWatermark());
        this.elements.bgRemoveBtn.addEventListener('click', () => this.removeBackground());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadImage());

        // 滑块值更新
        this.elements.qualitySlider.addEventListener('input', (e) => {
            this.elements.qualityValue.textContent = `${e.target.value}%`;
        });
        this.elements.watermarkOpacity.addEventListener('input', (e) => {
            this.elements.opacityValue.textContent = `${e.target.value}%`;
        });

        // 水印字体大小滑块
        this.elements.watermarkSize.addEventListener('input', (e) => {
            this.elements.fontSizeValue.textContent = `${e.target.value}px`;
        });

        // 水印位置按钮
        this.elements.positionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.positionBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.watermarkPosition = btn.dataset.position;
            });
        });

        // 压缩质量预览
        this.elements.qualitySlider.addEventListener('input', (e) => {
            this.updateCompressionPreview(e.target.value);
        });

        // 添加裁剪相关事件
        this.elements.cropFrame.addEventListener('mousedown', this.startCropDrag.bind(this));
        document.addEventListener('mousemove', this.doCropDrag.bind(this));
        document.addEventListener('mouseup', this.endCropDrag.bind(this));
        this.elements.cropBtn.addEventListener('click', () => this.applyCrop());

        // 添加裁剪框调整大小的事件
        const handles = this.elements.cropFrame.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                this.startResize(e, handle);
            });
        });

        // 添加裁剪尺寸输入框事件
        this.elements.cropWidth.addEventListener('change', () => this.updateCropSize('width'));
        this.elements.cropHeight.addEventListener('change', () => this.updateCropSize('height'));
    }

    // 图片上传处理
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            this.showLoading();
            try {
                const image = await this.loadImage(URL.createObjectURL(file));
                this.originalImage = image;
                this.currentImage = image;
                this.elements.previewImage.src = image.src;
                this.elements.uploadArea.style.display = 'none';
                this.elements.editArea.style.display = 'block';
                
                // 设置初始尺寸值和显示原始尺寸
                this.elements.widthInput.value = image.width;
                this.elements.heightInput.value = image.height;
                this.elements.originalSize.textContent = `${image.width} x ${image.height}`;
                
                // 更新压缩预览
                this.updateCompressionPreview(this.elements.qualitySlider.value);

                // 初始化裁剪区域
                this.initCropArea();
            } catch (error) {
                this.showError('图片加载失败，请重试');
            }
            this.hideLoading();
        }
    }

    // 拖拽处理
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.uploadArea.classList.add('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.elements.uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            this.elements.fileInput.files = e.dataTransfer.files;
            this.handleImageUpload({ target: { files: [file] } });
        }
    }

    // 调整图片尺寸
    async resizeImage() {
        if (!this.currentImage) return;
        
        this.showLoading();
        try {
            // 获取用户输入的宽度和高度
            const width = parseInt(this.elements.widthInput.value) || this.currentImage.width;
            const height = parseInt(this.elements.heightInput.value) || this.currentImage.height;
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            // 使用双线性插值算法进行缩放
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(this.currentImage, 0, 0, width, height);
            
            const resizedImage = await this.loadImage(canvas.toDataURL('image/png'));
            this.currentImage = resizedImage;
            this.elements.previewImage.src = resizedImage.src;
            this.showSuccess('尺寸调整成功！');
        } catch (error) {
            this.showError('调整尺寸失败，请重试');
        }
        this.hideLoading();
    }

    // 压缩图片
    async compressImage() {
        if (!this.currentImage) return;
        
        this.showLoading();
        try {
            const quality = parseInt(this.elements.qualitySlider.value) / 100;
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.width;
            canvas.height = this.currentImage.height;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(this.currentImage, 0, 0);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            const compressedImage = await this.loadImage(compressedDataUrl);
            this.currentImage = compressedImage;
            this.elements.previewImage.src = compressedImage.src;
            this.showSuccess('压缩成功！');
        } catch (error) {
            this.showError('压缩失败，请重试');
        }
        this.hideLoading();
    }

    // 添加水印
    async addWatermark() {
        if (!this.currentImage) return;
        
        this.showLoading();
        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.currentImage.width;
            canvas.height = this.currentImage.height;
            const ctx = canvas.getContext('2d');
            
            // 绘制原图
            ctx.drawImage(this.currentImage, 0, 0);
            
            // 水印设置
            const text = this.elements.watermarkText.value || '由他图片处理神器';
            const color = this.elements.watermarkColor.value;
            const opacity = parseInt(this.elements.watermarkOpacity.value) / 100;
            const fontSize = parseInt(this.elements.watermarkSize.value);
            
            ctx.globalAlpha = opacity;
            ctx.fillStyle = color;
            ctx.font = `${fontSize}px Arial`;
            
            // 计算水印位置
            const padding = 20;
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = fontSize;
            
            let x, y;
            switch (this.watermarkPosition) {
                case 'top-left':
                    x = padding;
                    y = textHeight + padding;
                    break;
                case 'top-center':
                    x = (canvas.width - textWidth) / 2;
                    y = textHeight + padding;
                    break;
                case 'top-right':
                    x = canvas.width - textWidth - padding;
                    y = textHeight + padding;
                    break;
                case 'middle-left':
                    x = padding;
                    y = canvas.height / 2;
                    break;
                case 'middle-center':
                    x = (canvas.width - textWidth) / 2;
                    y = canvas.height / 2;
                    break;
                case 'middle-right':
                    x = canvas.width - textWidth - padding;
                    y = canvas.height / 2;
                    break;
                case 'bottom-left':
                    x = padding;
                    y = canvas.height - padding;
                    break;
                case 'bottom-center':
                    x = (canvas.width - textWidth) / 2;
                    y = canvas.height - padding;
                    break;
                default: // bottom-right
                    x = canvas.width - textWidth - padding;
                    y = canvas.height - padding;
            }
            
            ctx.fillText(text, x, y);
            
            const watermarkedImage = await this.loadImage(canvas.toDataURL('image/png'));
            this.currentImage = watermarkedImage;
            this.elements.previewImage.src = watermarkedImage.src;
            this.showSuccess('水印添加成功！');
        } catch (error) {
            this.showError('添加水印失败，请重试');
        }
        this.hideLoading();
    }

    // 获取百度 AI 访问令牌
    async getBaiduAccessToken() {
        // 如果令牌还在有效期内，直接返回
        if (this.baiduAI.accessToken && Date.now() < this.baiduAI.tokenExpires) {
            return this.baiduAI.accessToken;
        }

        try {
            const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: this.baiduAI.apiKey,
                    client_secret: this.baiduAI.secretKey
                })
            });

            const data = await response.json();
            if (data.access_token) {
                this.baiduAI.accessToken = data.access_token;
                // 设置令牌过期时间（提前5分钟过期）
                this.baiduAI.tokenExpires = Date.now() + (data.expires_in - 300) * 1000;
                return data.access_token;
            } else {
                throw new Error('获取访问令牌失败');
            }
        } catch (error) {
            throw new Error('获取访问令牌失败: ' + error.message);
        }
    }

    // 图片转 Base64
    async imageToBase64(image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        // 移除 base64 前缀
        return canvas.toDataURL('image/jpeg').split(',')[1];
    }

    // 调用百度 AI 去除背景
    async removeBackground() {
        if (!this.currentImage) return;
        
        this.showLoading();
        try {
            // 准备图片数据
            const imageBase64 = await this.imageToBase64(this.currentImage);
            
            // 调用本地代理服务器
            const response = await fetch('http://localhost:3000/api/remove-bg', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageBase64
                })
            });

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error_msg || '去除背景失败');
            }

            // 处理返回的图片数据
            if (result.foreground) {
                const image = await this.loadImage(`data:image/png;base64,${result.foreground}`);
                this.currentImage = image;
                this.elements.previewImage.src = image.src;
                this.showSuccess('背景去除成功！');
            } else {
                throw new Error('未能获取处理后的图片');
            }
        } catch (error) {
            this.showError('去除背景失败: ' + error.message);
            console.error('去除背景错误:', error);
        }
        this.hideLoading();
    }

    // 下载处理后的图片
    downloadImage() {
        if (!this.currentImage) return;
        
        const link = document.createElement('a');
        link.download = 'processed-image.png';
        link.href = this.currentImage.src;
        link.click();
    }

    // 工具函数
    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }

    showMessage(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showInfo(message) {
        this.showMessage(message, 'info');
    }

    // 更新压缩预览信息
    async updateCompressionPreview(quality) {
        if (!this.currentImage) return;

        const canvas = document.createElement('canvas');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.currentImage, 0, 0);

        // 获取原始大小
        const originalBlob = await this.canvasToBlob(canvas, 'image/jpeg', 1);
        const originalSize = originalBlob.size;

        // 获取预估大小
        const compressedBlob = await this.canvasToBlob(canvas, 'image/jpeg', quality / 100);
        const compressedSize = compressedBlob.size;

        // 更新显示
        this.elements.originalFileSize.textContent = this.formatFileSize(originalSize);
        this.elements.estimatedFileSize.textContent = this.formatFileSize(compressedSize);
        const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        this.elements.compressionRatio.textContent = `${ratio}%`;
    }

    // 工具函数
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async canvasToBlob(canvas, type, quality) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), type, quality);
        });
    }

    // 初始化裁剪区域
    initCropArea() {
        if (!this.currentImage) return;

        const canvas = this.elements.cropCanvas;
        const ctx = canvas.getContext('2d');
        
        // 计算适合的画布尺寸，保持图片比例
        const containerWidth = this.elements.cropArea.offsetWidth;
        const containerHeight = this.elements.cropArea.offsetHeight;
        
        // 计算缩放比例，使图片完全适应容器
        const scaleWidth = containerWidth / this.currentImage.width;
        const scaleHeight = containerHeight / this.currentImage.height;
        const scale = Math.min(scaleWidth, scaleHeight);
        
        // 设置画布尺寸为容器大小
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // 计算居中位置
        const scaledWidth = this.currentImage.width * scale;
        const scaledHeight = this.currentImage.height * scale;
        const x = (containerWidth - scaledWidth) / 2;
        const y = (containerHeight - scaledHeight) / 2;
        
        // 清空画布并绘制图片
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this.currentImage, x, y, scaledWidth, scaledHeight);
        
        // 保存图片在画布中的实际位置和尺寸
        this.cropData.scale = scale;
        this.cropData.imageX = x;
        this.cropData.imageY = y;
        this.cropData.imageWidth = scaledWidth;
        this.cropData.imageHeight = scaledHeight;
        
        // 初始化裁剪框位置和大小
        const initialSize = Math.min(scaledWidth, scaledHeight) * 0.8;
        this.cropData.width = initialSize;
        this.cropData.height = initialSize;
        this.cropData.x = x + (scaledWidth - initialSize) / 2;
        this.cropData.y = y + (scaledHeight - initialSize) / 2;
        
        this.updateCropFrame();
    }

    // 更新裁剪框位置和大小
    updateCropFrame() {
        const frame = this.elements.cropFrame;
        frame.style.left = `${this.cropData.x}px`;
        frame.style.top = `${this.cropData.y}px`;
        frame.style.width = `${this.cropData.width}px`;
        frame.style.height = `${this.cropData.height}px`;
        
        // 更新输入框中的实际尺寸（考虑缩放比例）
        const realWidth = Math.round(this.cropData.width / this.cropData.scale);
        const realHeight = Math.round(this.cropData.height / this.cropData.scale);
        this.elements.cropWidth.value = realWidth;
        this.elements.cropHeight.value = realHeight;
    }

    // 开始拖动裁剪框
    startCropDrag(e) {
        e.preventDefault();
        if (e.target.classList.contains('resize-handle')) return;

        const canvas = this.elements.cropCanvas;
        const rect = canvas.getBoundingClientRect();
        
        this.cropData.isDragging = true;
        this.cropData.startX = e.clientX - rect.left - this.cropData.x;
        this.cropData.startY = e.clientY - rect.top - this.cropData.y;

        // 添加鼠标样式
        document.body.style.cursor = 'move';
    }

    // 拖动裁剪框
    doCropDrag(e) {
        if (!this.cropData.isDragging && !this.cropData.isResizing) return;

        e.preventDefault();

        const canvas = this.elements.cropCanvas;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.cropData.isDragging) {
            // 计算新位置，限制在图片范围内
            let newX = mouseX - this.cropData.startX;
            let newY = mouseY - this.cropData.startY;
            
            newX = Math.max(this.cropData.imageX, Math.min(newX, this.cropData.imageX + this.cropData.imageWidth - this.cropData.width));
            newY = Math.max(this.cropData.imageY, Math.min(newY, this.cropData.imageY + this.cropData.imageHeight - this.cropData.height));
            
            this.cropData.x = newX;
            this.cropData.y = newY;
        } else if (this.cropData.isResizing) {
            let newWidth, newHeight, newX = this.cropData.x, newY = this.cropData.y;

            switch (this.cropData.currentHandle) {
                case 'top-left':
                    newWidth = this.cropData.x + this.cropData.width - mouseX;
                    newHeight = this.cropData.y + this.cropData.height - mouseY;
                    newX = mouseX;
                    newY = mouseY;
                    break;
                case 'top-right':
                    newWidth = mouseX - this.cropData.x;
                    newHeight = this.cropData.y + this.cropData.height - mouseY;
                    newY = mouseY;
                    break;
                case 'bottom-left':
                    newWidth = this.cropData.x + this.cropData.width - mouseX;
                    newHeight = mouseY - this.cropData.y;
                    newX = mouseX;
                    break;
                case 'bottom-right':
                    newWidth = mouseX - this.cropData.x;
                    newHeight = mouseY - this.cropData.y;
                    break;
            }

            // 限制在图片范围内
            const minSize = 20;
            if (newWidth >= minSize && newHeight >= minSize) {
                const imageRight = this.cropData.imageX + this.cropData.imageWidth;
                const imageBottom = this.cropData.imageY + this.cropData.imageHeight;
                
                if (newX >= this.cropData.imageX && newX + newWidth <= imageRight &&
                    newY >= this.cropData.imageY && newY + newHeight <= imageBottom) {
                    this.cropData.width = newWidth;
                    this.cropData.height = newHeight;
                    this.cropData.x = newX;
                    this.cropData.y = newY;
                }
            }
        }

        this.updateCropFrame();
        
        // 更新输入框中的实际尺寸
        const realWidth = Math.round((this.cropData.width / this.cropData.scale));
        const realHeight = Math.round((this.cropData.height / this.cropData.scale));
        this.elements.cropWidth.value = realWidth;
        this.elements.cropHeight.value = realHeight;
    }

    // 结束拖动
    endCropDrag(e) {
        if (e) e.preventDefault();
        this.cropData.isDragging = false;
        this.cropData.isResizing = false;
        // 恢复默认鼠标样式
        document.body.style.cursor = 'default';
    }

    // 开始调整大小
    startResize(e) {
        e.preventDefault();
        e.stopPropagation();

        const handle = e.target;
        const canvas = this.elements.cropCanvas;
        
        this.cropData.isResizing = true;
        this.cropData.currentHandle = handle.className.split(' ')[1];

        // 添加鼠标样式
        document.body.style.cursor = getComputedStyle(handle).cursor;
    }

    // 应用裁剪
    async applyCrop() {
        if (!this.currentImage) return;
        
        this.showLoading();
        try {
            const canvas = document.createElement('canvas');
            
            // 计算实际的裁剪坐标和尺寸
            const actualX = (this.cropData.x - this.cropData.imageX) / this.cropData.scale;
            const actualY = (this.cropData.y - this.cropData.imageY) / this.cropData.scale;
            const actualWidth = this.cropData.width / this.cropData.scale;
            const actualHeight = this.cropData.height / this.cropData.scale;
            
            // 设置输出画布尺寸
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            const ctx = canvas.getContext('2d');
            
            // 确保使用高质量的图像缩放
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 从原始图像裁剪
            ctx.drawImage(
                this.currentImage,
                actualX, actualY,
                actualWidth, actualHeight,
                0, 0,
                actualWidth, actualHeight
            );
            
            const croppedImage = await this.loadImage(canvas.toDataURL('image/png'));
            this.currentImage = croppedImage;
            this.elements.previewImage.src = croppedImage.src;
            this.showSuccess('裁剪成功！');
        } catch (error) {
            console.error('裁剪错误:', error);
            this.showError('裁剪失败，请重试');
        }
        this.hideLoading();
    }

    // 添加通过输入框更新裁剪框尺寸的方法
    updateCropSize(dimension) {
        if (!this.currentImage) return;

        const newWidth = parseInt(this.elements.cropWidth.value) * this.cropData.scale;
        const newHeight = parseInt(this.elements.cropHeight.value) * this.cropData.scale;

        if (dimension === 'width' && newWidth >= 20 && newWidth <= this.elements.cropCanvas.width) {
            this.cropData.width = newWidth;
            // 调整位置确保不超出边界
            if (this.cropData.x + newWidth > this.elements.cropCanvas.width) {
                this.cropData.x = this.elements.cropCanvas.width - newWidth;
            }
        }

        if (dimension === 'height' && newHeight >= 20 && newHeight <= this.elements.cropCanvas.height) {
            this.cropData.height = newHeight;
            // 调整位置确保不超出边界
            if (this.cropData.y + newHeight > this.elements.cropCanvas.height) {
                this.cropData.y = this.elements.cropCanvas.height - newHeight;
            }
        }

        this.updateCropFrame();
    }
}

// 初始化编辑器
window.addEventListener('DOMContentLoaded', () => {
    new ImageEditor();
}); 