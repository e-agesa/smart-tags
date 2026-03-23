import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.middleware";
import * as chatService from "../services/chat.service";
import * as tagService from "../services/tag.service";

const router = Router();

// POST /api/chat/start — Finder starts a chat room for a tag
const startSchema = z.object({
  tag_code: z.string().min(1),
});

router.post(
  "/start",
  validate(startSchema),
  async (req: Request, res: Response): Promise<void> => {
    const tag = await tagService.getTagByCode(req.body.tag_code);
    if (!tag || tag.status !== "active") {
      res.status(404).json({ error: "Tag not found or inactive" });
      return;
    }

    const room = await chatService.createChatRoom(tag.id);
    res.status(201).json({
      room_id: room.id,
      finder_token: room.finder_token,
    });
  }
);

// GET /api/chat/:token/messages — Get messages by finder token
router.get(
  "/:token/messages",
  async (req: Request, res: Response): Promise<void> => {
    const room = await chatService.getChatRoomByToken(req.params.token as string);
    if (!room) {
      res.status(404).json({ error: "Chat room not found" });
      return;
    }

    const messages = await chatService.getMessages(room.id);
    res.json({ room_id: room.id, messages });
  }
);

// POST /api/chat/:token/send — Finder sends a message
const sendSchema = z.object({
  body: z.string().min(1).max(500),
});

router.post(
  "/:token/send",
  validate(sendSchema),
  async (req: Request, res: Response): Promise<void> => {
    const room = await chatService.getChatRoomByToken(req.params.token as string);
    if (!room) {
      res.status(404).json({ error: "Chat room not found" });
      return;
    }

    const message = await chatService.addMessage(room.id, "finder", req.body.body);
    res.status(201).json(message);
  }
);

// POST /api/chat/room/:roomId/reply — Owner replies (requires auth, handled by owner knowing room_id)
router.post(
  "/room/:roomId/reply",
  validate(sendSchema),
  async (req: Request, res: Response): Promise<void> => {
    const message = await chatService.addMessage(
      req.params.roomId as string,
      "owner",
      req.body.body
    );
    res.status(201).json(message);
  }
);

export { router as chatRoutes };
