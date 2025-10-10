import express from "express";
import { getCart, addItemToCart, updateCartItem, removeItemFromCart, checkoutCart } from "../controllers/cartController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all cart routes
router.use(verifyToken);

router.get("/", getCart);
router.post("/add", addItemToCart);
router.put("/item/:cartItemId", updateCartItem);
router.delete("/:cartItemId", removeItemFromCart);
router.post("/checkout", checkoutCart);

export default router;
