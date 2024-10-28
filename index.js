const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const fileOutput = path.join('/tmp', 'xl.json'); // Menyimpan hasil JSON
const tokenFile = path.join('/tmp', 'xl.token'); // Menyimpan token di path tetap
let accessToken = null;
let refreshToken = null;

// Membaca input dari command line
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

// Judul aplikasi
console.log("=================================");
console.log("        Cek Kuota XL            ");
console.log("=================================");

// Fungsi untuk login menggunakan email
async function login() {
    const login_email = await prompt("Masukkan email: ");
    console.log(`Login ${login_email}...`);

    try {
        const response = await axios.post(`https://srg-txl-login-controller-service.ext.dp.xl.co.id/v2/auth/email/${login_email}`, null, {
            headers: {
                'x-dynatrace': 'MT_3_2_763403741_15-0_a5734da2-0ecb-4c8d-8d21-b008aeec4733_30_456_73',
                'accept': 'application/json',
                'authorization': 'Basic ZGVtb2NsaWVudDpkZW1vY2xpZW50c2VjcmV0',
                'language': 'en',
                'version': '4.1.2',
                'user-agent': 'okhttp/3.12.1'
            }
        });
        if (response.data.statusCode === 200) {
            console.log("OTP telah dikirim ke email.");
            await verifyOtp(login_email);
        } else {
            console.error(`[${response.data.statusCode}] ${response.data.statusDescription}`);
        }
    } catch (error) {
        console.error("Error in login:", error.response ? error.response.data : error.message);
    }
}

// Fungsi untuk memverifikasi OTP dan menyimpan token
async function verifyOtp(login_email) {
    const otp = await prompt("Masukkan OTP: ");
    try {
        const response = await axios.get(`https://srg-txl-login-controller-service.ext.dp.xl.co.id/v2/auth/email/${login_email}/${otp}/000000000000000`, {
            headers: {
                'x-dynatrace': 'MT_3_2_763403741_15-0_a5734da2-0ecb-4c8d-8d21-b008aeec4733_30_456_73',
                'accept': 'application/json',
                'authorization': 'Basic ZGVtb2NsaWVudDpkZW1vY2xpZW50c2VjcmV0',
                'language': 'en',
                'version': '4.1.2',
                'user-agent': 'okhttp/3.12.1'
            }
        });
        if (response.data.statusCode === 200) {
            accessToken = response.data.result.data.accessToken;
            refreshToken = response.data.result.data.refreshToken;

            // Simpan token ke file xl.json
            fs.writeFileSync(tokenFile, JSON.stringify({ emailToken: login_email, accessToken, refreshToken }, null, 2));
            console.log("Login berhasil. Token telah disimpan di /tmp/xl.json.");
        } else {
            console.error(`[${response.data.statusCode}] ${response.data.statusDescription}`);
        }
    } catch (error) {
        console.error("Error in verifyOtp:", error.response ? error.response.data : error.message);
    }
}

// Fungsi untuk mengecek kuota
async function cekKuotaData() {
    if (!accessToken) {
        if (fs.existsSync(tokenFile)) {
            const tokenData = JSON.parse(fs.readFileSync(tokenFile));
            accessToken = tokenData.accessToken;
            refreshToken = tokenData.refreshToken;
        } else {
            console.log("Belum login. Silakan login terlebih dahulu.");
            return;
        }
    }

    const nomer_hp = await prompt("Masukkan nomor HP (contoh: 6281234567890): ");
    console.log(`Cek kuota untuk nomor ${nomer_hp}...`);

    try {
        const response = await axios.get(`https://srg-txl-utility-service.ext.dp.xl.co.id/v5/package/check/${nomer_hp}`, {
            headers: {
                'x-dynatrace': 'MT_3_1_763403741_16-0_a5734da2-0ecb-4c8d-8d21-b008aeec4733_0_396_167',
                'accept': 'application/json',
                'authorization': `Bearer ${accessToken}`,
                'language': 'en',
                'version': '4.1.2',
                'user-agent': 'okhttp/3.12.1'
            }
        });
        if (response.data.statusCode === 200) {
            console.log("Data Kuota:", JSON.stringify(response.data.result.data, null, 2));
        } else {
            console.error(`[${response.data.statusCode}] ${response.data.statusDescription}`);
            console.log(response.data.result.errorMessage);
        }
    } catch (error) {
        console.error("Error in cekKuotaData:", error.response ? error.response.data : error.message);
    }
}

// Fungsi untuk logout
async function logout() {
    if (!accessToken) {
        console.log("Belum login atau sudah logout.");
        return;
    }

    try {
        const response = await axios.post('https://srg-txl-login-controller-service.ext.dp.xl.co.id/v3/auth/logout', null, {
            headers: {
                'x-dynatrace': 'MT_3_4_763403741_22-0_a5734da2-0ecb-4c8d-8d21-b008aeec4733_0_284_143',
                'accept': 'application/json',
                'authorization': `Bearer ${accessToken}`,
                'language': 'en',
                'version': '4.1.2',
                'user-agent': 'okhttp/3.12.1'
            }
        });
        if (response.data.statusCode === 200) {
            console.log("Logout berhasil.");
            // Hapus token dari file
            fs.unlinkSync(tokenFile);
            accessToken = null;
            refreshToken = null;
        } else {
            console.error(`[${response.data.statusCode}] ${response.data.statusDescription}`);
        }
    } catch (error) {
        console.error("Error in logout:", error.response ? error.response.data : error.message);
    }
}

// Fungsi utama untuk memilih fitur
async function main() {
    while (true) {
        console.log("\nPilih fitur:");
        console.log("1. Login");
        console.log("2. Cek Kuota Data");
        console.log("3. Logout");
        console.log("4. Keluar");

        const choice = await prompt("Masukkan pilihan: ");
        if (choice === '1') {
            await login();
        } else if (choice === '2') {
            await cekKuotaData();
        } else if (choice === '3') {
            await logout();
        } else if (choice === '4') {
            console.log("Terima kasih! Sampai jumpa.");
            rl.close();
            break; // Keluar dari loop dan mengakhiri aplikasi
        } else {
            console.log("Pilihan tidak valid. Silakan coba lagi.");
        }
    }
}

// Menjalankan aplikasi
main();
