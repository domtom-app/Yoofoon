"use client";

import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { acceptTerms } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STEPS: { title: string; points: string[] }[] = [
  {
    title: "إيه هو فيد واستفيد؟",
    points: [
      "سوق مجاني فيه إعلانات وعروض من ناس ومؤسسات حواليك.",
      "الإعلانات اللي في محافظتك بتظهر الأول، وبعدها إعلانات كل مصر.",
    ],
  },
  {
    title: "إزاي بتتصفح؟",
    points: [
      "كل بطاقة فيها الاسم والسعر أو العرض والمدينة وعدد المهتمين.",
      "دوس على الصورة تفتح صفحة المعلن وكل إعلاناته.",
      "زر «منطقتي» بيعرض لك إعلانات منطقتك بس.",
    ],
  },
  {
    title: "يعني إيه «مهتم» والتقييم؟",
    points: [
      "دوس «مهتم» لو الإعلان عجبك.",
      "تقدر تهتم بإعلانات محافظتك بس، وبحد أقصى 10 كل 24 ساعة.",
      "الشريط والنسبة بيوضحوا حجم اهتمام الناس بالإعلان.",
    ],
  },
  {
    title: "المعلن هيستفيد إيه؟",
    points: [
      "يعرف مين مهتم بمنتجه وإقبال الناس عليه.",
      "لو إعلانه من أعلى 3 اهتمامًا في محافظته بيتثبت في الأول لمدة 7 أيام.",
      "يضيف اسمه ورقمه وروابطه عشان الناس توصله بسهولة.",
    ],
  },
  {
    title: "المهتم هيستفيد إيه؟",
    points: [
      "يلاقي خصومات وعروض وهدايا مجانية قريبة منه.",
      "ممكن يفوز بهدية لو الإعلان مجاني.",
    ],
  },
  {
    title: "المعلن بيختار الفائزين إزاي؟",
    points: [
      "الهدايا في الإعلانات «المجانية» بس، وبعدد الهدايا اللي حددها المعلن.",
      "من ملفه الشخصي بيفتح قائمة المهتمين ويختار الفائزين بنفسه.",
      "مينفعش يدي نفس الشخص هدية تانية قبل 14 يوم.",
    ],
  },
  {
    title: "الهدية بتوصل إزاي؟",
    points: [
      "الفائز بيوصله إشعار وبطاقة «فزت بهدية» في ملفه الشخصي.",
      "يقبل الهدية أو يردها، ولو رد بترجع للمهتمين التانيين.",
      "بعد القبول بتتواصلوا بالرقم أو الروابط اللي في صفحة المعلن.",
    ],
  },
  {
    title: "الإعلان بيفضل قد إيه؟",
    points: [
      "إعلان العرض (خصم أو مجاني) بيفضل 15 يوم.",
      "الإعلان العادي بيفضل 7 أيام.",
      "كل إعلان بيتراجع قبل ما ينزل، وأي تعديل منك بيرجعه للمراجعة.",
    ],
  },
  {
    title: "زر «إضافة» وإيه هو تاجر السعادة؟",
    points: [
      "زر «إضافة» بيخليك تنزل منتج أو عرض أو هدية في القسم.",
      "أي مستخدم مسجل يقدر يضيف، ومش شرط تكون تاجر أو صاحب مصنع.",
      "تاجر السعادة هو اللي بيدّي حاجة مجانًا من غير مقابل عشان يساعد الناس.",
      "ممكن يكون شخص عادي بيساعد بحاجة مش محتاجها أو مش مستفيد منها.",
      "بتختار تساعد أهل محافظتك أو مصر كلها، زي ما تحب.",
    ],
  },
  {
    title: "تنبيهات مهمة",
    points: [
      "الموقع وسيلة مساعدة بس في القسم ده، وبيعرّف الناس ببعض.",
      "الموقع مش مسؤول عن التسليم أو الاستلام أو التوصيل.",
      "الموقع مش مسؤول عن جودة أو حالة أو صحة أي بضاعة.",
      "البيع والشراء ودفع الفلوس بيتم مع البائع في صفحته، مش من خلال الموقع.",
      "الموقع مش مسؤول عن أي مبلغ يتبعت أو يتدفع لأي معلن.",
      "اتأكد من المعلن والمنتج بنفسك قبل أي تعامل، وبلّغنا عن أي إعلان مخالف.",
    ],
  },
];

export function TipsGuide() {
  const [agreed, setAgreed] = useState(false);
  return (
    <Dialog onOpenChange={() => setAgreed(false)}>
      <DialogTrigger
        render={<Button type="button" variant="outline" aria-label="شرح القسم" className="h-10 rounded-full px-4 font-bold" />}
      >
        <CircleHelp className="size-4" />
        شرح
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>إزاي بيشتغل القسم؟</DialogTitle>
          <DialogDescription className="sr-only">شرح فيد واستفيد</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-base font-bold leading-[1.5]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {i + 1}
                </span>
                {s.title}
              </p>
              <ul className="flex flex-col gap-1.5 ps-8">
                {s.points.map((p) => (
                  <li key={p} className="list-disc text-sm leading-[1.8] text-muted-foreground marker:text-primary">
                    {p}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="size-4 shrink-0 cursor-pointer accent-primary"
          />
          قرأت كافة الشروط بالموقع وأوافق عليها (يظهر بجانب اسمك علامة التوثيق)
        </label>
        <DialogClose
          render={
            <Button
              type="button"
              disabled={!agreed}
              onClick={() => void acceptTerms()}
              className="h-12 w-full rounded-2xl text-base font-bold"
            />
          }
        >
          تم
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
