import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export default function DeleteMessageModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteMessageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl shadow-material-3 w-full max-w-sm">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          
          <h3 className="text-lg font-medium text-on-surface text-center mb-2">
            ลบข้อความ
          </h3>
          <p className="text-on-surface-variant text-sm text-center mb-6">
            คุณแน่ใจหรือไม่ที่จะลบข้อความนี้? การกระทำนี้ไม่สามารถยกเลิกได้
          </p>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 bg-destructive text-white hover:bg-red-600"
            >
              {isLoading ? "กำลังลบ..." : "ลบ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
