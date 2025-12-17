import { prisma } from "@shared/config/database.js";
import jwt from "jsonwebtoken";
import redisClient from "@shared/config/redis.js";
import { comparePassword, hashPassword, isPasswordHashed } from "@shared/utilities/password.js";
import "dotenv/config";

export const generateToken = async (payload, expiresIn = process.env.JWT_EXPIRES_IN || "1h") => {
  const token = jwt.sign({ data: payload }, process.env.JWT_SECRET, { expiresIn });
  await redisClient.set(`jwt:${token}`, "valid");
  return token;
};

export const verifyLogin = async (req, res, next) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(200).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const user = await prisma.userInfo.findFirst({ where: { username: username, del: 0 } });

    if (!user) {
      return res.status(200).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    let passwordMatch = false;
    if (isPasswordHashed(user.password)) {
      passwordMatch = await comparePassword(password, user.password);
    } else {
      passwordMatch = password === user.password;

      if (passwordMatch) {
        const hashedPassword = await hashPassword(password);
        try {
          await prisma.$executeRaw`UPDATE sfa_user SET password = ${hashedPassword} WHERE id = ${user.id}`;
        } catch (err) {
        }
      }
    }

    if (!passwordMatch) {
      return res.status(200).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    try {
      const now = new Date();
      await prisma.$executeRaw`UPDATE userInfo SET latestLogin = ${now} WHERE id = ${user.id}`;
    } catch (err) {
    }

    const token = await generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        uniqueId: user.uniqueId,
        username: user.username,
        type: user.type
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

export const updateLoginCreds = async (req, res, next) => {
  const { newUserName, newPassword } = req.body;
  const { id } = req.user;

  try {
    if (!newUserName || !newPassword) {
      return res.status(200).json({
        success: false,
        message: "userId, newUserName and newPassword are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(200).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await prisma.userInfo.findFirst({ where: { id: id } });
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "User not found",
      });
    }

    const existingUser = await prisma.userInfo.findFirst({
      where: {
        username: newUserName,
        NOT: { id: id },
      },
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.userInfo.update({
      where: { id: id },
      data: {
        username: newUserName,
        password: hashedPassword
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login credentials updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        uniqueId: updatedUser.uniqueId,
        username: updatedUser.username,
        type: updatedUser.type
      },
    });

  } catch (error) {
    console.error("Update credentials error:", error);
    next(error);
  }
};