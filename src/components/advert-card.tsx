"use client";

import { useState } from "react";
import { CandidateCard } from "@/components/candidate-cards";
import { EditTip } from "@/components/admin-tips";
import { useAction } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { NominatorsButton } from "@/components/nominators-dialog";
import { ReportButton } from "@/components/report-button";
import { NominateForm } from "@/components/tips-section";
import { Typewriter } from "@/components/typewriter";
import { deleteTip } from "@/app/actions/tips";
import type { Places } from "@/lib/area";
import type { TipItem } from "@/lib/tips-data";
import { Trash2 } from "lucide-react";

export const OWNER_LABEL = "إعلاني فيد واستفيد";

function OwnerTools({ tip, places }: { tip: TipItem; places: Places }) {
  const remove = useAction((fd) => deleteTip(fd), () => {});
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-2">
        <EditTip
          tip={{ id: tip.id, title: tip.name, body: tip.body, photoUrl: tip.photoUrl, area: tip.area, link: tip.link, offer: tip.offer, offerQty: tip.offerQty, offerPercent: tip.offerPercent }}
          places={places}
        />
        {confirming ? (
          <form action={remove.run} className="contents">
            <input type="hidden" name="id" value={tip.id} />
            <Button type="submit" variant="destructive" autoFocus onBlur={() => setConfirming(false)} disabled={remove.pending} className="h-10 rounded-xl text-sm font-bold">
              تأكيد الحذف
            </Button>
          </form>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirming(true)} className="h-10 rounded-xl text-sm font-bold text-destructive">
            <Trash2 className="size-4" />
            حذف
          </Button>
        )}
      </div>
      {tip.approved && tip.offer === "free" && <NominatorsButton tipId={tip.id} />}
      {remove.error && <p role="alert" className="text-center text-sm text-destructive">{remove.error}</p>}
    </div>
  );
}

// One full-width ad card with its text typed out below. In owner mode the nominate button is replaced by the review status and edit tools.
export function AdvertCard({
  tip,
  mine = false,
  account = false,
  owner = false,
  places,
}: {
  tip: TipItem;
  mine?: boolean;
  account?: boolean;
  owner?: boolean;
  places?: Places;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      {owner && <p className="text-center text-sm font-bold leading-[1.5]">{OWNER_LABEL}</p>}
      <ul>
        <CandidateCard
          c={{ ...tip, details: tip.areaText ? [tip.areaText] : undefined }}
          unit="مهتم"
          mine={mine}
          description={
            tip.body ? (
              <div className="text-start text-sm font-medium leading-7">
                <Typewriter text={tip.body} maxLines={6} />
              </div>
            ) : undefined
          }
        >
          {owner ? (
            <>
              {!tip.approved && (
                <p className="text-center text-xs font-bold text-muted-foreground">بانتظار المراجعة</p>
              )}
              {places && <OwnerTools tip={tip} places={places} />}
            </>
          ) : (
            <>
              <NominateForm tip={tip} mine={mine} account={account} />
              {account && <ReportButton tipId={tip.id} />}
            </>
          )}
        </CandidateCard>
      </ul>
    </div>
  );
}
