// routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const ctrl = require('../controllers/auth.controller');

// === Auth ===

// Buscar por correo
router.get('/email/:correo', ctrl.buscarPorCorreo);

// Iniciar sesión
router.post('/login', ctrl.login);

// Perfil actual
router.get('/me', ctrl.me);

// Token por correo (simple: resuelve correo desde usuarioAcceso)
router.post('/correo/token-simple', ctrl.sendEmailTokenSimple);

// Desafío de preguntas
router.post('/desafio-preguntas', ctrl.desafioPreguntas);

// Registro de usuario
router.post('/registro', ctrl.registerUser);

// Cerrar sesión
router.post('/logout', ctrl.logout);

// Cambiar contraseña
router.post('/change-password', ctrl.changePassword);

// Cambiar contraseña tras desbloqueo (si es otra lógica, déjalo)
router.post('/cambiar-contrasena-desbloqueo', ctrl.changePassword);

// Preguntas de reto
router.get('/preguntas-challenge/:usuarioAcceso', ctrl.getChallengeQuestions);

// Verificación por correo electrónico (contrato “oficial” con { usuarioAcceso, Correo })
router.post('/correo/token', ctrl.sendEmailToken);

// Verificar token de correo
router.post('/correo/verify', ctrl.verifyEmailToken);

// Configuración/Verificación TOTP
router.get('/totp/setup', ctrl.getTotpSetup);
router.post('/totp/verify', ctrl.verifyTotp);

module.exports = router;
