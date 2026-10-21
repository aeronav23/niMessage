# 💬 niMessage

### Offline LAN Messenger

**niMessage** is a lightweight, experimental messenger that allows two devices to exchange messages over a local Wi-Fi network without an internet connection.

The project was created for fun using AI-assisted development (vibe coding).

> ⚠️ This is a hobby project, not a professional messaging application.

## ✨ Features

- 📡 Offline messaging over a local Wi-Fi network
- 💬 Real-time peer-to-peer communication using WebRTC
- 📱 Works on iPhone, iPad, and desktop browsers
- 📷 Connection using QR codes or text codes
- 🔐 Encrypted WebRTC data channels
- 💾 Local chat history
- 📂 Chat archiving
- 🌐 No dedicated messaging server required
- 📲 Progressive Web App (PWA)

## 🚀 How to Connect

1. Open niMessage on both devices.
2. Make sure both devices are connected to the same Wi-Fi network.
3. On Device A, select **Create Connection**.
4. On Device B, select **Join Friend**.
5. Scan Device A's QR code using Device B.
6. Generate the response code on Device B.
7. Scan Device B's QR code using Device A.
8. Wait until the connection status shows **Connected**.

You can now exchange messages!

## 🌐 Offline Mode

To use niMessage offline, open the application at least once while connected to the internet.

The browser caches the files required to launch the application.

After that, niMessage can work without internet access, provided both devices can communicate over the same local network.

You can also connect devices using a smartphone's Wi-Fi hotspot.

**Note:** Some Wi-Fi networks block direct communication between connected devices.

## 🛠️ Technologies

- HTML
- CSS
- JavaScript
- WebRTC DataChannel
- IndexedDB
- Service Workers
- QR codes

## ⚠️ Limitations

- Currently supports one-to-one messaging.
- Both devices must have a working network path between them.
- Reconnecting after a complete disconnection may require exchanging QR codes again.
- Background operation is limited by mobile browsers.
- No push notifications when the application is closed.
- Peer identity is not cryptographically authenticated.

## 🤖 AI-Assisted Development

niMessage is an amateur project developed entirely with the assistance of **ChatGPT by OpenAI**, using an approach commonly known as **vibe coding**.

The project's concept, feature ideas, testing, and development direction were provided by its creator.

AI was used to generate, modify, and debug the source code.

The creator started this project at the age of 13, without prior programming experience.

This project was made primarily for learning, experimentation, and fun.

## 🗺️ Roadmap

| Version | Planned Feature |
|---------|-----------------|
| 1.8 | Built-in user guide |
| 1.9 | Notification sounds |
| 2.0 | English language support |
| Future | Connection stability improvements |

## 📌 Disclaimer

niMessage is an experimental hobby project.

It is provided as-is, without guarantees of reliability, security, or compatibility.

It should not be used for critical or emergency communications.

---

**Made with curiosity, JavaScript, WebRTC, and a little help from AI. 🚀**
