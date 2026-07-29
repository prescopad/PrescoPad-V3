from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal


class PatientRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[Literal["male", "female", "other"]] = None
    weight: Optional[float] = Field(None, ge=0.5, le=500)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    blood_group: Optional[str] = None
    bloodGroup: Optional[str] = None
    allergies: Optional[str] = Field(None, max_length=300)

    @field_validator('name')
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Patient name cannot be blank')
        return v.strip()

    @field_validator('phone')
    @classmethod
    def phone_digits_only(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        digits = ''.join(c for c in v if c.isdigit())
        if v and len(digits) < 7:
            raise ValueError('Phone number must have at least 7 digits')
        return v

    def normalized(self) -> dict:
        d = {k: v for k, v in {
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "weight": self.weight,
            "phone": self.phone,
            "address": self.address,
            "blood_group": self.blood_group or self.bloodGroup,
            "allergies": self.allergies,
        }.items() if v is not None}
        return d


class QueueRequest(BaseModel):
    patient_id: Optional[str] = None
    patientId: Optional[str] = None
    notes: Optional[str] = None
    added_by: Optional[str] = None
    consultation_type: Optional[str] = None
    consultationType: Optional[str] = None

    def get_patient_id(self) -> str:
        return self.patient_id or self.patientId or ""


class QueueStatusRequest(BaseModel):
    status: Literal["waiting", "in_progress", "completed", "cancelled"]


class MedicineItem(BaseModel):
    medicine_name: Optional[str] = None
    medicineName: Optional[str] = None
    type: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    timing: Optional[str] = None
    notes: Optional[str] = None

    def normalized(self) -> dict:
        return {
            "medicine_name": self.medicine_name or self.medicineName or "",
            "type": self.type,
            "dosage": self.dosage,
            "frequency": self.frequency,
            "duration": self.duration,
            "timing": self.timing,
            "notes": self.notes,
        }


class LabTestItem(BaseModel):
    test_name: Optional[str] = None
    testName: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    def normalized(self) -> dict:
        return {
            "test_name": self.test_name or self.testName or "",
            "category": self.category,
            "notes": self.notes,
        }


class VitalsItem(BaseModel):
    bp: Optional[str] = None
    pulse: Optional[str] = None
    temp: Optional[str] = None
    spo2: Optional[str] = None
    weight: Optional[str] = None
    height: Optional[str] = None
    bmi: Optional[str] = None
    bloodSugar: Optional[str] = None
    blood_sugar: Optional[str] = None

    def normalized(self) -> dict:
        return {
            "bp": self.bp,
            "pulse": self.pulse,
            "temp": self.temp,
            "spo2": self.spo2,
            "weight": self.weight,
            "height": self.height,
            "bmi": self.bmi,
            "blood_sugar": self.bloodSugar or self.blood_sugar,
        }


class SymptomDetailItem(BaseModel):
    name: str
    severity: Optional[str] = None
    duration: Optional[str] = None
    pattern: Optional[str] = None


class PrescriptionRequest(BaseModel):
    patient_id: Optional[str] = None
    patientId: Optional[str] = None
    patient_name: Optional[str] = None
    patientName: Optional[str] = None
    patient_age: Optional[int] = None
    patientAge: Optional[int] = None
    patient_gender: Optional[str] = None
    patientGender: Optional[str] = None
    patient_phone: Optional[str] = None
    patientPhone: Optional[str] = None
    doctor_id: Optional[str] = None

    vitals: Optional[dict] = None
    is_mlc: Optional[bool] = None
    isMlc: Optional[bool] = None
    mlc_notes: Optional[str] = None
    mlcNotes: Optional[str] = None

    diagnosis: Optional[str] = None
    advice: Optional[str] = None
    follow_up_date: Optional[str] = None
    followUpDate: Optional[str] = None
    consultation_type: Optional[str] = None
    consultationType: Optional[str] = None
    symptoms: Optional[List[str]] = []
    symptoms_detail: Optional[List[dict]] = []
    symptomsDetail: Optional[List[dict]] = []
    referred_to: Optional[str] = None
    referredTo: Optional[str] = None

    medicines: Optional[List[MedicineItem]] = []
    lab_tests: Optional[List[LabTestItem]] = []
    labTests: Optional[List[LabTestItem]] = []

    def normalized(self) -> dict:
        meds = self.medicines or []
        tests = self.lab_tests or self.labTests or []
        return {
            "patient_id": self.patient_id or self.patientId,
            "patient_name": self.patient_name or self.patientName,
            "patient_age": self.patient_age or self.patientAge,
            "patient_gender": self.patient_gender or self.patientGender,
            "patient_phone": self.patient_phone or self.patientPhone,
            "consultation_type": self.consultation_type or self.consultationType,
            "vitals": self.vitals,
            "is_mlc": self.is_mlc if self.is_mlc is not None else self.isMlc,
            "mlc_notes": self.mlc_notes or self.mlcNotes,
            "diagnosis": self.diagnosis,
            "advice": self.advice,
            "follow_up_date": self.follow_up_date or self.followUpDate,
            "symptoms": self.symptoms or [],
            "symptoms_detail": self.symptoms_detail or self.symptomsDetail or [],
            "referred_to": self.referred_to or self.referredTo,

            "medicines": [m.normalized() for m in meds],
            "lab_tests": [t.normalized() for t in tests],
        }


class CustomMedicineRequest(BaseModel):
    name: str
    type: Optional[str] = None
    strength: Optional[str] = None
    manufacturer: Optional[str] = None


class CustomMedicineUsageRequest(BaseModel):
    # Frontend sends {name} for usage tracking (by name not id)
    medicine_id: Optional[str] = None
    name: Optional[str] = None


class CustomLabTestRequest(BaseModel):
    name: str
    category: Optional[str] = None


class CustomLabTestUsageRequest(BaseModel):
    test_id: Optional[str] = None
    name: Optional[str] = None


class FinalizePrescriptionRequest(BaseModel):
    signature: Optional[str] = None
    pdf_hash: Optional[str] = None
    pdfHash: Optional[str] = None


class PrescriptionTemplateRequest(BaseModel):
    name: str

    diagnosis: Optional[str] = None
    advice: Optional[str] = None
    symptoms: Optional[List[str]] = []
    medicines: Optional[List[MedicineItem]] = []
    lab_tests: Optional[List[LabTestItem]] = []
    labTests: Optional[List[LabTestItem]] = []

    def normalized(self) -> dict:
        meds = self.medicines or []
        tests = self.lab_tests or self.labTests or []
        return {
            "name": self.name,

            "diagnosis": self.diagnosis,
            "advice": self.advice,
            "symptoms": self.symptoms or [],
            "medicines": [m.normalized() for m in meds],
            "lab_tests": [t.normalized() for t in tests],
        }


class MedicalCertificateRequest(BaseModel):
    patient_id: Optional[str] = None
    patientId: Optional[str] = None
    patient_name: Optional[str] = "Patient"
    patientName: Optional[str] = "Patient"
    patient_age: Optional[int] = 0
    patientAge: Optional[int] = 0
    patient_gender: Optional[str] = ""
    patientGender: Optional[str] = ""
    patient_address: Optional[str] = ""
    patientAddress: Optional[str] = ""
    diagnosis: str
    rest_days: Optional[int] = 1
    restDays: Optional[int] = 1
    start_date: str
    startDate: Optional[str] = None
    end_date: str
    endDate: Optional[str] = None
    fitness_status: Optional[str] = "unfit"
    fitnessStatus: Optional[str] = "unfit"
    reason: Optional[str] = ""

    def normalized(self) -> dict:
        return {
            "patient_id": self.patient_id or self.patientId,
            "patient_name": self.patientName or self.patient_name,
            "patient_age": self.patientAge or self.patient_age,
            "patient_gender": self.patientGender or self.patient_gender,
            "patient_address": self.patientAddress or self.patient_address,
            "diagnosis": self.diagnosis,
            "rest_days": self.restDays or self.rest_days or 1,
            "start_date": self.startDate or self.start_date,
            "end_date": self.endDate or self.end_date,
            "fitness_status": self.fitnessStatus or self.fitness_status or "unfit",
            "reason": self.reason or "",
        }


class ReceiptRequest(BaseModel):
    receipt_no: Optional[str] = None
    receiptNo: Optional[str] = None
    patient_id: Optional[str] = None
    patientId: Optional[str] = None
    patient_name: Optional[str] = "Patient"
    patientName: Optional[str] = "Patient"
    amount: float
    amount_in_words: Optional[str] = None
    amountInWords: Optional[str] = None
    payment_mode: Optional[str] = "cash"
    paymentMode: Optional[str] = "cash"
    transaction_ref: Optional[str] = None
    transactionRef: Optional[str] = None
    dated: Optional[str] = None
    drawn_on: Optional[str] = None
    drawnOn: Optional[str] = None
    towards: Optional[str] = "Consultation & Treatment Fee"

    def normalized(self) -> dict:
        return {
            "receipt_no": self.receiptNo or self.receipt_no,
            "patient_id": self.patient_id or self.patientId,
            "patient_name": self.patientName or self.patient_name,
            "amount": self.amount,
            "amount_in_words": self.amountInWords or self.amount_in_words,
            "payment_mode": self.paymentMode or self.payment_mode or "cash",
            "transaction_ref": self.transactionRef or self.transaction_ref,
            "dated": self.dated,
            "drawn_on": self.drawnOn or self.drawn_on,
            "towards": self.towards or "Consultation & Treatment Fee",
        }
