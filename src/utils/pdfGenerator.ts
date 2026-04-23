import jsPDF from 'jspdf';
import moment from 'moment';

// Simple number to words converter for Philippine Pesos
const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    
    return str.trim() ? str.trim() + ' Pesos' : 'Zero Pesos';
};

// Alternative standard US/PH number to words converter
const convertNumberToWords = (amount: number): string => {
    const words = [];
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const num = Math.floor(amount);
    
    if (num === 0) return 'Zero Pesos';
    
    let n = num;
    if (Math.floor(n / 1000000) > 0) {
        words.push(convertNumberToWords(Math.floor(n / 1000000)).replace(' Pesos', '') + ' Million');
        n %= 1000000;
    }
    if (Math.floor(n / 1000) > 0) {
        if (Math.floor(n / 1000) < 20) {
            words.push(units[Math.floor(n / 1000)] + ' Thousand');
        } else {
            words.push(tens[Math.floor(n / 10000)] + (Math.floor((n % 10000) / 1000) !== 0 ? '-' + units[Math.floor((n % 10000) / 1000)] : '') + ' Thousand');
        }
        n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
        words.push(units[Math.floor(n / 100)] + ' Hundred');
        n %= 100;
    }
    if (n > 0) {
        if (n < 20) {
            words.push(units[n]);
        } else {
            words.push(tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + units[n % 10] : ''));
        }
    }
    
    return words.join(' ') + ' Pesos';
};


export const generatePaymentSlip = (payment: any, user: any) => {
    // Create new A4 landscape PDF
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5'
    });

    const startX = 10;
    const startY = 10;
    const width = 190;
    const height = 120;

    // Set font to Times for standard formal look
    doc.setFont("times", "bold");
    
    // Draw Dashed Boundary Rectangle
    doc.setLineDashPattern([3, 3], 0);
    doc.setLineWidth(0.5);
    doc.rect(startX, startY, width, height);

    // Draw internal vertical dashed line to separate 1/3 and 2/3
    const divX = startX + 65;
    doc.line(divX, startY, divX, startY + height);

    // Left Section (1/3)
    const col1X = startX + 5;
    let currY = startY + 15;

    // Checkboxes Student, Employee, Visitor
    doc.setLineDashPattern([], 0); // Solid lines for boxes
    doc.setLineWidth(0.2);
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    
    doc.rect(col1X, currY - 3, 3, 3);
    // Draw checkmark inside Student
    doc.line(col1X, currY - 1.5, col1X + 1.5, currY);
    doc.line(col1X + 1.5, currY, col1X + 3, currY - 3);
    doc.text("Student", col1X + 5, currY);

    doc.rect(col1X + 22, currY - 3, 3, 3);
    doc.text("Employee", col1X + 27, currY);

    doc.rect(col1X + 45, currY - 3, 3, 3);
    doc.text("Visitor", col1X + 50, currY);

    currY += 12;
    doc.text("Resident No.", col1X, currY);
    doc.line(col1X + 22, currY, col1X + 55, currY);
    doc.text(user?.studentId || '', col1X + 23, currY - 1);

    currY += 12;
    doc.text("Room No.", col1X, currY);
    doc.line(col1X + 18, currY, col1X + 55, currY);
    doc.text(user?.studentProfile?.roomNumber || '', col1X + 19, currY - 1);

    currY += 15;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("Mahogany", col1X + 5, currY);
    currY += 8;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("Hostel", col1X + 5, currY);
    doc.line(col1X + 18, currY, col1X + 33, currY); doc.text("Aircon", col1X + 35, currY);
    
    currY += 8;
    doc.line(col1X + 18, currY, col1X + 33, currY); doc.text("Nonaircon", col1X + 35, currY);

    currY += 12;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("Kilala", col1X + 5, currY);
    doc.rect(col1X + 18, currY - 3, 3, 3); doc.text("Guesthouse", col1X + 23, currY);
    currY += 8;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("Rubia", col1X + 5, currY);
    doc.rect(col1X + 18, currY - 3, 3, 3); doc.text("Transient", col1X + 23, currY);

    currY += 12;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("1st Semester", col1X + 5, currY);
    currY += 8;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("2nd Semester", col1X + 5, currY);
    currY += 8;
    doc.rect(col1X, currY - 3, 3, 3); doc.text("Summer", col1X + 5, currY);


    // Right Section (2/3) - Header
    const col2X = divX + 10;
    let rightY = startY + 15;

    doc.setFontSize(16);
    doc.setFont("times", "bold");
    doc.text("BUKIDNON STATE UNIVERSITY", col2X, rightY);
    doc.setFontSize(14);
    doc.setFont("times", "normal");
    rightY += 6;
    doc.text("University Dormitories", col2X, rightY);
    doc.setFontSize(16);
    doc.setFont("times", "bold");
    rightY += 8;
    doc.text("PAYMENT SLIP", col2X, rightY);

    // Right Section - Form Fields
    doc.setFontSize(12);
    doc.setFont("times", "normal");
    
    rightY += 15;
    const todayDate = moment().format('MMMM DD, YYYY');
    doc.text("Date:", col2X, rightY);
    doc.line(col2X + 12, rightY, col2X + 55, rightY);
    doc.text(todayDate, col2X + 14, rightY - 1);

    rightY += 12;
    doc.text("Name of Payee:", col2X, rightY);
    doc.line(col2X + 30, rightY, startX + width - 10, rightY);
    doc.setFont("times", "bold");
    const payeeName = user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    doc.text(payeeName.toUpperCase(), col2X + 32, rightY - 1);
    doc.setFont("times", "normal");

    rightY += 12;
    doc.text("Pay the amount of", col2X, rightY);
    doc.line(col2X + 35, rightY, startX + width - 10, rightY);
    const amountInWords = convertNumberToWords(payment.amount);
    doc.setFont("times", "italic");
    doc.text(amountInWords, col2X + 37, rightY - 1);
    doc.setFont("times", "normal");

    rightY += 12;
    const numericAmount = new Intl.NumberFormat('en-PH').format(payment.amount);
    doc.text(`(Php ${numericAmount}) at the Cashier's Office for the month of`, col2X, rightY);
    doc.line(col2X + 90, rightY, startX + width - 10, rightY);
    doc.text(moment(payment.dueDate).format('MMMM YYYY'), col2X + 92, rightY - 1);

    rightY += 20;
    doc.text("Assessed by:", col2X, rightY);
    doc.line(col2X + 25, rightY, startX + width - 30, rightY);
    doc.setFontSize(10);
    doc.text("Signature over Printed Name", col2X + 35, rightY + 4);

    // Document Code Block (sideways on the far left outside the main box or at the bottom)
    doc.setFontSize(8);
    doc.text("Document Code: DORM-F-004 | Revision No: 01 | Issue No: 01 | Issue Date: March 12, 2024", startX, startY + height + 5);

    doc.save(`Payment_Slip_${moment().format('YYYYMMDD')}.pdf`);
};
