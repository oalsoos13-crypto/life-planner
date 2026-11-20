// نتيجة صريحة بدل رمي أخطاء للقواعد المتوقعة (Pragmatic: «البرامج الميتة ما بتكذب»)
export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; code: string; message: string };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = (code: string, message: string): Err => ({ ok: false, code, message });

// خطأ مجال: لما قاعدة صلبة بتنكسر من مكان ما لازم يوصل له
export class DomainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "DomainError";
  }
}
