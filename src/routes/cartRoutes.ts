import express from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cartController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all cart routes
router.use(verifyToken);

router.get("/", getCart);
router.post("/add", addToCart);
router.post("/clear", clearCart);
router.put("/item/:cartItemId", updateCartItem);
router.delete("/:cartItemId", removeFromCart);

export default router;