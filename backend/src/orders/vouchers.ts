import { BadRequestException } from '@nestjs/common';

export interface VoucherRule {
  code: string;
  description: string;
  minOrderValue?: number;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  maxDiscount?: number;
}

export const VALID_VOUCHERS: Record<string, VoucherRule> = {
  GIAM10: {
    code: 'GIAM10',
    description: 'Giảm 10% tối đa 30.000 đ',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 30000,
  },
  BREW20: {
    code: 'BREW20',
    description: 'Giảm 20.000 đ cho đơn từ 40.000 đ',
    minOrderValue: 40000,
    discountType: 'FIXED',
    discountValue: 20000,
  },
  WELCOME: {
    code: 'WELCOME',
    description: 'Giảm 15.000 đ cho khách hàng',
    discountType: 'FIXED',
    discountValue: 15000,
  },
};

export function applyVoucher(
  voucherCode?: string,
  subtotal: number = 0,
): { discount: number; appliedCode?: string } {
  if (!voucherCode || !voucherCode.trim()) {
    return { discount: 0 };
  }

  const code = voucherCode.trim().toUpperCase();
  const voucher = VALID_VOUCHERS[code];
  if (!voucher) {
    throw new BadRequestException(
      `Mã giảm giá "${voucherCode}" không hợp lệ hoặc đã hết hạn`,
    );
  }

  if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
    throw new BadRequestException(
      `Mã "${code}" chỉ áp dụng cho đơn hàng từ ${voucher.minOrderValue.toLocaleString('vi-VN')} đ trở lên`,
    );
  }

  let discount = 0;
  if (voucher.discountType === 'PERCENT') {
    discount = Math.round((subtotal * voucher.discountValue) / 100);
    if (voucher.maxDiscount) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  } else if (voucher.discountType === 'FIXED') {
    discount = voucher.discountValue;
  }

  discount = Math.min(discount, subtotal);

  return { discount, appliedCode: code };
}
