import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Download, Sparkles, ArrowRight, Clock } from "lucide-react";
import { Modal } from "../../../lib/components/modal";
import { useUpdateContext } from "../../../lib/contexts/updateContext";

interface UpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateModal({ open, onOpenChange }: UpdateModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state: updateState } = useUpdateContext();
  const updateInfo = updateState.updateInfo;

  if (!updateInfo?.available) {
    return null;
  }

  const handleUpdateNow = () => {
    onOpenChange(false);
    navigate("/administrator?tab=updates");
  };

  const handleLater = () => {
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      className="max-h-[90vh] min-w-[600px] flex flex-col"
      title={t("mainMenu.updateModal.title", "New Update Available!")}
      subtitle={t("mainMenu.updateModal.subtitle", "A new version of the application is ready to download")}
      icon={
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
          <Sparkles className="h-5 w-5 text-orange-500" />
        </div>
      }
      showCloseButton={true}
      closeOnOverlayClick={true}
      closeOnEscape={true}
      actions={[
        {
          label: t("mainMenu.updateModal.later", "Later"),
          variant: "outline",
          onClick: handleLater,
        },
        {
          label: t("mainMenu.updateModal.updateNow", "Update Now"),
          variant: "default",
          onClick: handleUpdateNow,
          icon: <Download className="h-4 w-4" />,
          className: "bg-orange-500 hover:bg-orange-600 text-white",
        },
      ]}
    >
      <div className="space-y-6 py-2">
        {/* Version Info */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("mainMenu.updateModal.currentVersion", "Current Version")}
              </span>
            </div>
            <span className="text-sm font-semibold">{updateInfo.currentVersion || "N/A"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("mainMenu.updateModal.latestVersion", "Latest Version")}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* Release Notes */}
        {updateInfo.releaseNotes && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              {t("mainMenu.updateModal.whatsNew", "What's New")}
            </h4>
            <div 
              className="release-notes-scrollable rounded-lg border border-border bg-card p-4 max-h-[30vh] overflow-y-auto"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
              }}
            >
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-2">
                {updateInfo.releaseNotes}
              </div>
            </div>
          </div>
        )}

        {/* Update Benefits */}
        <div className="rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {t("mainMenu.updateModal.benefitsTitle", "Why update?")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>{t("mainMenu.updateModal.benefit1", "New features and improvements")}</li>
                <li>{t("mainMenu.updateModal.benefit2", "Bug fixes and stability enhancements")}</li>
                <li>{t("mainMenu.updateModal.benefit3", "Security updates and patches")}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Note */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          <span>
            {t("mainMenu.updateModal.actionNote", "Click 'Update Now' to go to the update page and start downloading")}
          </span>
        </div>
      </div>
    </Modal>
  );
}
