"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { chooseDistrict, voteMember } from "@/app/actions/vote";
import { CandidateCards } from "@/components/candidate-cards";
import { DistrictFields } from "@/components/district-fields";
import { JoinDialog } from "@/components/join-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ParliamentData } from "@/lib/voting-data";
import type { WindowStatus } from "@/lib/voting";

type Ready = Extract<ParliamentData, { ok: true }>;

export function ParliamentView({
  data,
  status,
  startsAt,
  endsAt,
}: {
  data: Ready;
  status: WindowStatus;
  startsAt: string | null;
  endsAt: string | null;
}) {
  const [override, setOverride] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const homeId = data.districtId;
  const viewedId = override ?? homeId;
  const foreign = viewedId !== null && viewedId !== homeId;
  const district = data.districts.find((d) => d.id === viewedId);
  const govName = data.governorates.find((g) => g.id === district?.governorateId)?.name;
  const centerName = data.centers.find((c) => c.id === district?.centerId)?.name;
  const members = data.members.filter((m) => m.districtId === viewedId);

  const saveHome = (id: string) =>
    start(async () => {
      const res = await chooseDistrict(id);
      setError(res.error ?? null);
      if (!res.error) {
        setOverride(null);
        setAdding(false);
      }
    });

  return (
    <div className="flex flex-col gap-4">
      {viewedId && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate py-1 text-sm font-bold leading-[1.8]">
              {[govName, centerName, district?.name].filter(Boolean).join(" - ")}
            </p>
            {!foreign && homeId && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold leading-[1.8] text-primary">
                دائرتي
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            {foreign && (
              <Button
                variant="ghost"
                onClick={() => {
                  setOverride(null);
                  setBrowsing(false);
                }}
                className="h-9 rounded-xl px-3 text-sm font-bold text-primary"
              >
                دائرتي
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setBrowsing((v) => !v)}
              className="h-9 rounded-xl px-3 text-sm font-bold text-primary"
            >
              دوائر أخرى
            </Button>
          </div>
        </div>
      )}

      {(browsing || !viewedId) && (
        <div className="mx-auto w-full max-w-sm rounded-3xl border bg-card p-4">
          {!viewedId && (
            <p className="mb-3 text-center text-base font-bold leading-[1.5]">اختر دائرة لعرض أعضائها</p>
          )}
          <DistrictFields
            key={viewedId ?? "none"}
            governorates={data.governorates}
            centers={data.centers}
            districts={data.districts}
            initialId={viewedId}
            submitLabel="عرض"
            onSubmit={(id) => {
              setOverride(id === homeId ? null : id);
              setBrowsing(false);
            }}
          />
        </div>
      )}

      {viewedId &&
        (members.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">لا يوجد أعضاء في هذه الدائرة</p>
        ) : (
          <CandidateCards
            candidates={members}
            votedId={data.votedId}
            voteAction={voteMember}
            status={status}
            startsAt={startsAt}
            endsAt={endsAt}
            sharePath="/parliament"
            account={data.account}
            disabledLabel={data.account && foreign ? "ليست دائرتك" : undefined}
            onBeforeVote={() => {
              if (!data.account) {
                setJoining(true);
                return false;
              }
              if (homeId) return true;
              setAdding(true);
              return false;
            }}
          />
        ))}

      {data.account && homeId && !data.votedId && !foreign && (
        <Button
          variant="ghost"
          render={<Link href="/profile" />}
          nativeButton={false}
          className="mx-auto h-9 rounded-xl px-3 text-sm font-bold text-muted-foreground"
        >
          تغيير دائرتي
        </Button>
      )}

      <JoinDialog
        open={joining}
        onOpenChange={setJoining}
        places={{ governorates: data.governorates, centers: data.centers, districts: data.districts }}
        initialId={viewedId}
      />

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>أضف دائرتك أولًا</DialogTitle>
            <DialogDescription>تصوّت لأعضاء دائرتك فقط.</DialogDescription>
          </DialogHeader>
          <DistrictFields
            governorates={data.governorates}
            centers={data.centers}
            districts={data.districts}
            initialId={viewedId}
            submitLabel="حفظ"
            pending={pending}
            error={error}
            onSubmit={saveHome}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
