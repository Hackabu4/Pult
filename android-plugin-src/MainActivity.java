package kz.remote.universal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IrBlasterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
