export function numberToWords(num: number): string {
  if (num <= 0) return 'Zero Rupees Only';
  
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      str += double[n - 10] + ' ';
    } else if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) {
        str += single[n % 10] + ' ';
      }
    } else if (n > 0) {
      str += single[n] + ' ';
    }
    return str;
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = '';

  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  const hundred = rem % 1000;

  if (crore > 0) result += convertLessThanThousand(crore) + 'Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + 'Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + 'Thousand ';
  if (hundred > 0) result += convertLessThanThousand(hundred);

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise).trim() + ' Paise';
  }

  return result.trim() + ' Only';
}
