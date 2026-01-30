import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { auth } from "../lib/auth.js";


export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ message: "All fields are required" });
    }
    //additional logic for registeing user here
    const existinguser = await prisma.user.findUnique({ where: { email } });
    if (existinguser) {
      return res.status(409).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 6);

    await prisma.user.create({
        data:{
            name,
            email,
            password: hashedPassword,
            role: "CUSTOMER",
            
        },
        
    })
    return res.status(201).json({ message: "User registered successfully" });



    }
     catch (error) {
        return res.status(500).json({ message: "Internal server error registration failed" });
     }
  }

  export const login = async (req: Request, res: Response) => {
    try{
        const {email , password} = req.body;
        const user = await prisma.user.findUnique({where:{email}});
        if(!user){
            return res.status(404).json({message: "User not found"});
        }
        if(user.isBanned){
            return res.status(403).json({message: "User is banned"});
        }
        if(!user.password){
            return res.status(400).json({message: "Invalid authentication method"});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(401).json({message: "Invalid credentials wrong Password"});
        }
        const sessionData = await auth.api.signInEmail({
            body: {
                email: user.email,
                password: password
            }
        });
        
        res.cookie("session", sessionData.token, {
            httpOnly: true,
            sameSite: "lax"
        });
        
        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                role: user.role,
                email: user.email
            }
        });
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error login failed" });
    }
  }

