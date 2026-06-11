import { z } from 'zod';
import * as usersService from './users.service.js';

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['MANAGER', 'STAFF']),
});

const updateSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function listUsersHandler(req, res, next) {
  try {
    const users = await usersService.listUsers(req.user);
    res.json(users);
  } catch (err) { next(err); }
}

export async function getUserHandler(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.json(user);
  } catch (err) { next(err); }
}

export async function createUserHandler(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const user = await usersService.createUser(data, req.user.id, req.ip, req.headers['user-agent']);
    res.status(201).json(user);
  } catch (err) { next(err); }
}

export async function updateUserHandler(req, res, next) {
  try {
    const data = updateSchema.parse(req.body);
    const user = await usersService.updateUser(req.params.id, data, req.user.id, req.ip, req.headers['user-agent']);
    res.json(user);
  } catch (err) { next(err); }
}

export async function manualVerifyHandler(req, res, next) {
  try {
    const user = await usersService.manualVerifyUser(req.params.id, req.user.id, req.ip, req.headers['user-agent']);
    res.json(user);
  } catch (err) { next(err); }
}

export async function resendVerificationHandler(req, res, next) {
  try {
    await usersService.resendUserVerification(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function deleteUserHandler(req, res, next) {
  try {
    await usersService.softDeleteUser(req.params.id, req.user.id, req.ip, req.headers['user-agent']);
    res.status(204).send();
  } catch (err) { next(err); }
}
