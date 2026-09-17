package com.example.pult;

import android.app.Activity;
import android.content.Context;
import android.hardware.ConsumerIrManager;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private ConsumerIrManager irManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        irManager = (ConsumerIrManager) getSystemService(Context.CONSUMER_IR_SERVICE);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);

        Button btnPower = new Button(this);
        btnPower.setText("POWER (Қосу/Өшіру)");
        btnPower.setOnClickListener(v -> sendIR());

        layout.addView(btnPower);
        setContentView(layout);
    }

    private void sendIR() {
        if (irManager != null && irManager.hasIrEmitter()) {
            // Standard NEC pattern
            int[] pattern = {9000, 4500, 560, 560, 560, 1690, 560, 560};
            irManager.transmit(38000, pattern);
            Toast.makeText(this, "Сигнал жіберілді!", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "ИҚ-датчик табылмады!", Toast.LENGTH_SHORT).show();
        }
    }
}
